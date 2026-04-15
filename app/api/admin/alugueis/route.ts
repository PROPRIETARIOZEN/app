import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

// GET /api/admin/alugueis?page=1&mes=&status=&view=lista|inadimplencia
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const page    = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const mes     = searchParams.get('mes')    ?? ''   // YYYY-MM
  const status  = searchParams.get('status') ?? ''
  const view    = searchParams.get('view')   ?? 'lista'

  const admin = createAdminSupabaseClient()
  const agora = new Date()

  // ── 1. Período para gráfico (6 meses) ───────────────────────────────────
  const ha6Meses    = new Date(agora.getFullYear(), agora.getMonth() - 5, 1)
  const ha6MesesStr = `${ha6Meses.getFullYear()}-${String(ha6Meses.getMonth() + 1).padStart(2, '0')}-01`

  // ── 2. Buscar aluguéis com JOIN imoveis + profiles ───────────────────────
  type AluguelRow = {
    id: string
    mes_referencia: string
    valor: number | null
    valor_pago: number | null
    status: string
    data_pagamento: string | null
    imovel_id: string
    inquilino_id: string | null
    imoveis: {
      id: string
      apelido: string
      user_id: string
      profiles: { id: string; nome: string; email: string } | null
    } | null
    inquilinos: { id: string; nome: string } | null
  }

  let listQuery = admin
    .from('alugueis')
    .select(`
      id,
      mes_referencia,
      valor,
      valor_pago,
      status,
      data_pagamento,
      imovel_id,
      inquilino_id,
      imoveis!alugueis_imovel_id_fkey (
        id,
        apelido,
        user_id,
        profiles!imoveis_user_id_fkey (
          id,
          nome,
          email
        )
      ),
      inquilinos!alugueis_inquilino_id_fkey (
        id,
        nome
      )
    `)

  if (mes) {
    listQuery = listQuery
      .gte('mes_referencia', `${mes}-01`)
      .lte('mes_referencia', `${mes}-31`)
  } else {
    listQuery = listQuery.gte('mes_referencia', ha6MesesStr)
  }

  if (status) listQuery = listQuery.eq('status', status as 'pago' | 'pendente' | 'atrasado' | 'cancelado' | 'estornado')

  listQuery = listQuery.order('mes_referencia', { ascending: false })

  const { data: rawAlugueis, error } = await listQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const alugueis = (rawAlugueis ?? []) as unknown as AluguelRow[]

  // ── 3. Summary cards ──────────────────────────────────────────────────────
  const mesAtualStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
  const doMesAtual  = alugueis.filter(a => a.mes_referencia.startsWith(mesAtualStr))

  const totalEmitidoMes = doMesAtual.reduce((s, a) => s + (a.valor ?? 0), 0)
  const totalRecebidoMes = doMesAtual
    .filter(a => a.status === 'pago')
    .reduce((s, a) => s + (a.valor_pago ?? a.valor ?? 0), 0)
  const totalAtrasados   = alugueis.filter(a => a.status === 'atrasado').length
  const totalAtrasadoR$  = alugueis
    .filter(a => a.status === 'atrasado')
    .reduce((s, a) => s + (a.valor ?? 0), 0)

  // ── 4. Gráfico 6 meses ──────────────────────────────────────────────────
  // Apenas aluguéis dos últimos 6 meses (independente de filtros de status)
  const { data: rawChart } = await admin
    .from('alugueis')
    .select('mes_referencia, valor, valor_pago, status')
    .gte('mes_referencia', ha6MesesStr)
    .order('mes_referencia', { ascending: false })

  type ChartRow = { mes_referencia: string; valor: number | null; valor_pago: number | null; status: string }
  const chartRows = (rawChart ?? []) as ChartRow[]

  const byMes: Record<string, { pago: number; pendente: number; atrasado: number }> = {}
  for (const a of chartRows) {
    const key = a.mes_referencia.slice(0, 7)
    if (!byMes[key]) byMes[key] = { pago: 0, pendente: 0, atrasado: 0 }
    if (a.status === 'pago')      byMes[key].pago      += a.valor_pago ?? a.valor ?? 0
    else if (a.status === 'atrasado') byMes[key].atrasado += a.valor ?? 0
    else                          byMes[key].pendente  += a.valor ?? 0
  }

  const chart_history = Array.from({ length: 6 }, (_, i) => {
    const d     = new Date(agora.getFullYear(), agora.getMonth() - (5 - i), 1)
    const key   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('.', '').replace(' de ', '/')
      .replace(/^(\w)/, (c: string) => c.toUpperCase())
    return { mes: key, label, ...(byMes[key] ?? { pago: 0, pendente: 0, atrasado: 0 }) }
  })

  // ── 5. View inadimplência ────────────────────────────────────────────────
  if (view === 'inadimplencia') {
    // Buscar TODOS os atrasados para calcular inadimplência completa
    const { data: rawAtrasados } = await admin
      .from('alugueis')
      .select(`
        id,
        mes_referencia,
        valor,
        imovel_id,
        inquilino_id,
        imoveis!alugueis_imovel_id_fkey (
          id,
          apelido,
          user_id,
          profiles!imoveis_user_id_fkey (
            id,
            nome,
            email
          )
        ),
        inquilinos!alugueis_inquilino_id_fkey (
          id,
          nome
        )
      `)
      .eq('status', 'atrasado')
      .order('mes_referencia', { ascending: true })

    type AtrasadoRow = {
      id: string
      mes_referencia: string
      valor: number | null
      imovel_id: string
      inquilino_id: string | null
      imoveis: { id: string; apelido: string; user_id: string; profiles: { id: string; nome: string; email: string } | null } | null
      inquilinos: { id: string; nome: string } | null
    }
    const atrasados = (rawAtrasados ?? []) as unknown as AtrasadoRow[]

    // Calcular dias em atraso
    const hoje = new Date()
    const enriched = atrasados.map(a => {
      const venc = new Date(`${a.mes_referencia.slice(0, 7)}-10`)
      const dias = Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / (1000 * 60 * 60 * 24)))
      return {
        id:            a.id,
        mes_referencia: a.mes_referencia,
        valor:         a.valor,
        dias_atraso:   dias,
        imovel_id:     a.imovel_id,
        imovel_nome:   a.imoveis?.apelido ?? '',
        owner_nome:    a.imoveis?.profiles?.nome  ?? '',
        owner_email:   a.imoveis?.profiles?.email ?? '',
        inquilino_nome: a.inquilinos?.nome ?? '',
      }
    }).sort((a, b) => b.dias_atraso - a.dias_atraso)

    const totalInadimplenciaR$ = atrasados.reduce((s, a) => s + (a.valor ?? 0), 0)

    // Top proprietários inadimplentes
    const porProprietario: Record<string, { nome: string; email: string; total: number; count: number }> = {}
    for (const a of atrasados) {
      const uid   = a.imoveis?.user_id ?? ''
      const nome  = a.imoveis?.profiles?.nome  ?? ''
      const email = a.imoveis?.profiles?.email ?? ''
      if (!porProprietario[uid]) porProprietario[uid] = { nome, email, total: 0, count: 0 }
      porProprietario[uid].total += a.valor ?? 0
      porProprietario[uid].count += 1
    }
    const topProprietarios = Object.entries(porProprietario)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    // Top imóveis inadimplentes
    const porImovel: Record<string, { nome: string; total: number; count: number }> = {}
    for (const a of atrasados) {
      const iid  = a.imovel_id
      const nome = a.imoveis?.apelido ?? ''
      if (!porImovel[iid]) porImovel[iid] = { nome, total: 0, count: 0 }
      porImovel[iid].total += a.valor ?? 0
      porImovel[iid].count += 1
    }
    const topImoveis = Object.entries(porImovel)
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)

    const from     = (page - 1) * PAGE_SIZE
    const pageData = enriched.slice(from, from + PAGE_SIZE)

    return NextResponse.json({
      view: 'inadimplencia',
      data: pageData,
      summary: {
        total_inadimplencia_r$:  Math.round(totalInadimplenciaR$ * 100) / 100,
        count_atrasados:         atrasados.length,
        top_proprietarios:       topProprietarios,
        top_imoveis:             topImoveis,
      },
      pagination: {
        page,
        page_size:   PAGE_SIZE,
        total:       enriched.length,
        total_pages: Math.ceil(enriched.length / PAGE_SIZE),
      },
    })
  }

  // ── 6. View lista normal ──────────────────────────────────────────────────
  const enrichedList = alugueis.map(a => ({
    id:              a.id,
    mes_referencia:  a.mes_referencia,
    valor:           a.valor,
    valor_pago:      a.valor_pago,
    status:          a.status,
    data_pagamento:  a.data_pagamento,
    imovel_id:       a.imovel_id,
    imovel_nome:     a.imoveis?.apelido ?? '',
    owner_nome:      a.imoveis?.profiles?.nome  ?? '',
    owner_email:     a.imoveis?.profiles?.email ?? '',
    inquilino_nome:  a.inquilinos?.nome ?? '',
  }))

  const from     = (page - 1) * PAGE_SIZE
  const pageData = enrichedList.slice(from, from + PAGE_SIZE)

  return NextResponse.json({
    view: 'lista',
    data: pageData,
    summary: {
      total_emitido_mes:   Math.round(totalEmitidoMes   * 100) / 100,
      total_recebido_mes:  Math.round(totalRecebidoMes  * 100) / 100,
      count_atrasados:     totalAtrasados,
      total_atrasado_r$:   Math.round(totalAtrasadoR$   * 100) / 100,
    },
    chart_history,
    pagination: {
      page,
      page_size:   PAGE_SIZE,
      total:       enrichedList.length,
      total_pages: Math.ceil(enrichedList.length / PAGE_SIZE),
    },
  })
}
