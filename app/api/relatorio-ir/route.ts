import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calcularResumoAnual } from '@/lib/ir'
import type { PlanoTipo } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plano, role')
    .eq('id', user.id)
    .single()

  const plano = (profile?.role === 'admin' ? 'elite' : profile?.plano ?? 'gratis') as PlanoTipo
  if (plano !== 'elite') {
    return NextResponse.json({ error: 'Disponível apenas no plano Elite' }, { status: 403 })
  }

  const anoParam = req.nextUrl.searchParams.get('ano')
  const anoAtual = new Date().getFullYear()
  const ano = anoParam ? parseInt(anoParam, 10) : anoAtual

  if (isNaN(ano) || ano < 2020 || ano > anoAtual) {
    return NextResponse.json({ error: 'Ano inválido' }, { status: 400 })
  }

  // Passo 1 — IDs dos imóveis do usuário
  const { data: imoveis, error: errImoveis } = await supabase
    .from('imoveis')
    .select('id')
    .eq('user_id', user.id)

  if (errImoveis) {
    console.error('[relatorio-ir] erro ao buscar imoveis:', errImoveis.message)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }

  const imovelIds = (imoveis ?? []).map(i => i.id)

  if (imovelIds.length === 0) {
    return NextResponse.json(calcularResumoAnual(ano, []))
  }

  // Passo 2 — aluguéis pagos no ano filtrados pelos imóveis do usuário
  const anoStr = String(ano)
  const { data: alugueis, error } = await supabase
    .from('alugueis')
    .select('mes_referencia, valor, valor_pago')
    .in('imovel_id', imovelIds)
    .eq('status', 'pago')
    .like('mes_referencia', `${anoStr}%`)

  if (error) {
    console.error('[relatorio-ir] erro ao buscar alugueis:', error.message)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }

  const registros = (alugueis ?? []).map(a => ({
    mes_referencia: a.mes_referencia,
    valor: a.valor,
    valor_pago: a.valor_pago,
  }))

  const resumo = calcularResumoAnual(ano, registros)
  return NextResponse.json(resumo)
}
