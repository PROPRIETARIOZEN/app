import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 25

// GET /api/admin/imoveis?page=1&search=&tipo=&ativo=&ordenar=
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const page    = Math.max(1, parseInt(searchParams.get('page')    ?? '1', 10))
  const search  = searchParams.get('search')  ?? ''
  const tipo    = searchParams.get('tipo')    ?? ''
  const ativo   = searchParams.get('ativo')   ?? ''
  const ordenar = searchParams.get('ordenar') ?? 'mais_recentes'

  const admin = createAdminSupabaseClient()

  // ── 1. Buscar imóveis com JOIN profiles ──────────────────────────────────
  let query = admin
    .from('imoveis')
    .select(`
      id,
      apelido,
      endereco,
      tipo,
      valor_aluguel,
      ativo,
      billing_mode,
      criado_em,
      user_id,
      profiles!imoveis_user_id_fkey (
        id,
        nome,
        email
      )
    `)

  if (search.trim()) {
    const s = search.trim()
    query = query.or(`apelido.ilike.%${s}%,endereco.ilike.%${s}%`)
  }
  if (tipo) query = query.eq('tipo', tipo as 'apartamento' | 'casa' | 'kitnet' | 'comercial' | 'terreno' | 'outro')
  if (ativo === 'ativo')   query = query.eq('ativo', true)
  if (ativo === 'inativo') query = query.eq('ativo', false)

  if (ordenar === 'mais_recentes') query = query.order('criado_em', { ascending: false })
  else if (ordenar === 'mais_antigos') query = query.order('criado_em', { ascending: true })
  else if (ordenar === 'maior_valor') query = query.order('valor_aluguel', { ascending: false })
  else if (ordenar === 'menor_valor') query = query.order('valor_aluguel', { ascending: true })
  else query = query.order('criado_em', { ascending: false })

  const { data: rawImoveis, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type ImovelRow = {
    id: string
    apelido: string
    endereco: string
    tipo: string
    valor_aluguel: number | null
    ativo: boolean
    billing_mode: string | null
    criado_em: string
    user_id: string
    profiles: { id: string; nome: string; email: string } | null
  }

  const imoveis = (rawImoveis ?? []) as unknown as ImovelRow[]
  const totalCount = imoveis.length

  // ── 2. Summary cards ──────────────────────────────────────────────────────
  const totalAtivos  = imoveis.filter(im => im.ativo).length
  const totalInativos = imoveis.filter(im => !im.ativo).length

  const tipoCount: Record<string, number> = {}
  for (const im of imoveis) {
    tipoCount[im.tipo] = (tipoCount[im.tipo] ?? 0) + 1
  }

  const ativos = imoveis.filter(im => im.ativo && im.valor_aluguel)
  const valorMedio = ativos.length > 0
    ? ativos.reduce((s, im) => s + (im.valor_aluguel ?? 0), 0) / ativos.length
    : 0

  // ── 3. Contar inquilinos ativos por imóvel ─────────────────────────────
  const imovelIds = imoveis.map(im => im.id)
  let inquilinosMap: Record<string, number> = {}
  if (imovelIds.length > 0) {
    const { data: inq } = await admin
      .from('inquilinos')
      .select('imovel_id')
      .in('imovel_id', imovelIds)
      .eq('ativo', true)
    for (const r of (inq ?? [])) {
      if (r.imovel_id) inquilinosMap[r.imovel_id] = (inquilinosMap[r.imovel_id] ?? 0) + 1
    }
  }

  const vagosCount = imoveis.filter(im => im.ativo && (inquilinosMap[im.id] ?? 0) === 0).length

  // ── 4. Enriquecer ──────────────────────────────────────────────────────
  const enriched = imoveis.map(im => ({
    id:            im.id,
    apelido:       im.apelido,
    endereco:      im.endereco,
    tipo:          im.tipo,
    valor_aluguel: im.valor_aluguel,
    ativo:         im.ativo,
    billing_mode:  im.billing_mode,
    criado_em:     im.criado_em,
    user_id:       im.user_id,
    owner_nome:    im.profiles?.nome  ?? '',
    owner_email:   im.profiles?.email ?? '',
    tem_inquilino: (inquilinosMap[im.id] ?? 0) > 0,
  }))

  // ── 5. Paginar ────────────────────────────────────────────────────────────
  const from     = (page - 1) * PAGE_SIZE
  const pageData = enriched.slice(from, from + PAGE_SIZE)

  return NextResponse.json({
    data: pageData,
    summary: {
      total:       totalCount,
      total_ativos: totalAtivos,
      total_inativos: totalInativos,
      vagos_count: vagosCount,
      valor_medio: Math.round(valorMedio * 100) / 100,
      por_tipo:    tipoCount,
    },
    pagination: {
      page,
      page_size:   PAGE_SIZE,
      total:       totalCount,
      total_pages: Math.ceil(totalCount / PAGE_SIZE),
    },
  })
}
