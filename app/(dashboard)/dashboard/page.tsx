import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { StatCard } from '@/components/dashboard/stat-card'
import { ReajusteAlertas } from '@/components/dashboard/reajuste-alertas'
import { MonthSelector } from '@/components/dashboard/month-selector'
import { AluguelAcaoBtn } from '@/components/dashboard/aluguel-acao-btn'
import { RevenueChart } from '@/components/dashboard/revenue-chart'
import type { RevenueDataPoint } from '@/components/dashboard/revenue-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp, CheckCircle, AlertCircle, Building2,
  Calendar, Banknote, Activity, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_CONFIG = {
  pago:     { label: 'Pago',     badgeCls: 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]' },
  pendente: { label: 'Pendente', badgeCls: 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]' },
  atrasado: { label: 'Atrasado', badgeCls: 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2]' },
} as const

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
]

const ATIVIDADE_ICON_CONFIG = {
  pagamento: { bg: 'bg-emerald-100', text: 'text-emerald-600' },
  imovel:    { bg: 'bg-blue-100',    text: 'text-blue-600' },
  inquilino: { bg: 'bg-violet-100',  text: 'text-violet-600' },
  reajuste:  { bg: 'bg-amber-100',   text: 'text-amber-600' },
}

function corAvatar(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length]
}

function diasAtraso(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const agora = new Date(); agora.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((agora.getTime() - venc.getTime()) / 86_400_000))
}

function diasParaVencer(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const agora = new Date(); agora.setHours(0, 0, 0, 0)
  return Math.ceil((venc.getTime() - agora.getTime()) / 86_400_000)
}

function tempoRelativo(data: string): string {
  const d = new Date(data.includes('T') ? data : data + 'T00:00:00')
  const diff = Date.now() - d.getTime()
  const mins = Math.floor(diff / 60_000)
  const horas = Math.floor(diff / 3_600_000)
  const dias = Math.floor(diff / 86_400_000)
  if (mins < 60) return `há ${mins} min`
  if (horas < 24) return `há ${horas} hora${horas !== 1 ? 's' : ''}`
  if (dias === 1) return 'ontem'
  if (dias < 7) return `há ${dias} dias`
  return formatarData(data)
}

function urgenciaBadge(dias: number, status: string): { cls: string; label: string } {
  if (status === 'atrasado') {
    const d = diasAtraso(/* we pass dias as negative here */ '')
    void d
    return { cls: 'bg-red-100 text-red-700', label: 'Atrasado' }
  }
  if (dias <= 2) return { cls: 'bg-red-100 text-red-700',   label: `${dias}d` }
  if (dias <= 4) return { cls: 'bg-amber-100 text-amber-700', label: `${dias}d` }
  return          { cls: 'bg-slate-100 text-slate-600',      label: `${dias}d` }
}

function calcTrend(
  atual: number,
  anterior: number,
): { percentual: number; positivo: boolean } | null {
  if (anterior === 0) return null
  const diff = ((atual - anterior) / anterior) * 100
  return { percentual: Math.abs(Math.round(diff)), positivo: diff >= 0 }
}

type AluguelTotais = { valor: number; status: string }

type AluguelLista = {
  id: string
  valor: number
  status: string
  data_vencimento: string
  data_pagamento: string | null
  imovel: { apelido: string; user_id: string } | null
  inquilino: { nome: string } | null
}

type AluguelAtividade = {
  id: string
  valor: number
  data_pagamento: string | null
  mes_referencia: string
  imovel: { apelido: string } | null
  inquilino: { nome: string } | null
}

type AluguelReceita = {
  valor: number
  mes_referencia: string
  imovel: { user_id: string } | null
}

type ImovelParaPreview = {
  id: string
  apelido: string
  valor_aluguel: number
  dia_vencimento: number
  data_inicio_contrato: string | null
  inquilinos: { nome: string; ativo: boolean }[]
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const hoje = new Date()

  // Parse selected month from ?mes=YYYY-MM
  let selectedYear = hoje.getFullYear()
  let selectedMonth = hoje.getMonth() + 1

  const rawMes = searchParams?.mes
  if (rawMes && /^\d{4}-\d{2}$/.test(rawMes)) {
    const [y, m] = rawMes.split('-').map(Number)
    if (m >= 1 && m <= 12) { selectedYear = y; selectedMonth = m }
  }

  const mesAtual = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`
  const selectedMesKey = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`

  // Previous month for trend
  const prevDate = new Date(selectedYear, selectedMonth - 2, 1)
  const mesPrev = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-01`

  // 6 months back for revenue chart
  const sixMonthsAgo = new Date(selectedYear, selectedMonth - 7, 1)
  const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`

  const em7Dias = new Date(hoje); em7Dias.setDate(hoje.getDate() + 7)
  const em30Dias = new Date(hoje); em30Dias.setDate(hoje.getDate() + 30)

  const [
    { data: profile },
    { data: alugueisMes },
    { data: alugueisMesPrev },
    { data: alugueisList },
    { data: imoveisAtivos },
    { data: proximosVencimentos },
    { data: proximosReajustes },
    { data: atividadeRecente },
    { data: receitaMeses },
    { data: imoveisParaPreview },
  ] = await Promise.all([
    supabase.from('profiles').select('nome').eq('id', user.id).single(),

    // Totais do mês selecionado
    supabase.from('alugueis')
      .select('valor, status, imovel:imoveis!inner(user_id)')
      .eq('mes_referencia', mesAtual)
      .eq('imovel.user_id', user.id) as unknown as Promise<{ data: AluguelTotais[] | null; error: unknown }>,

    // Totais do mês anterior (para tendência)
    supabase.from('alugueis')
      .select('valor, status, imovel:imoveis!inner(user_id)')
      .eq('mes_referencia', mesPrev)
      .eq('imovel.user_id', user.id) as unknown as Promise<{ data: AluguelTotais[] | null; error: unknown }>,

    // Lista detalhada do mês selecionado
    supabase.from('alugueis')
      .select('id, valor, status, data_vencimento, data_pagamento, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('mes_referencia', mesAtual)
      .eq('imovel.user_id', user.id)
      .order('data_vencimento', { ascending: true })
      .limit(8) as unknown as Promise<{ data: AluguelLista[] | null; error: unknown }>,

    // Imóveis ativos
    supabase.from('imoveis').select('id').eq('user_id', user.id).eq('ativo', true),

    // Próximos vencimentos (7 dias) — sempre baseado em hoje
    supabase.from('alugueis')
      .select('id, valor, data_vencimento, status, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('imovel.user_id', user.id)
      .in('status', ['pendente', 'atrasado'])
      .lte('data_vencimento', em7Dias.toISOString().split('T')[0])
      .order('data_vencimento', { ascending: true })
      .limit(4) as unknown as Promise<{ data: AluguelLista[] | null; error: unknown }>,

    // Reajustes próximos
    supabase.from('imoveis')
      .select('id, apelido, data_proximo_reajuste, valor_aluguel, indice_reajuste, percentual_fixo')
      .eq('user_id', user.id).eq('ativo', true)
      .not('data_proximo_reajuste', 'is', null)
      .lte('data_proximo_reajuste', em30Dias.toISOString().split('T')[0])
      .gte('data_proximo_reajuste', hoje.toISOString().split('T')[0])
      .order('data_proximo_reajuste', { ascending: true })
      .limit(5),

    // Atividade recente (últimos pagamentos)
    supabase.from('alugueis')
      .select('id, valor, data_pagamento, mes_referencia, imovel:imoveis!inner(apelido, user_id), inquilino:inquilinos(nome)')
      .eq('status', 'pago')
      .eq('imovel.user_id', user.id)
      .not('data_pagamento', 'is', null)
      .order('data_pagamento', { ascending: false })
      .limit(5) as unknown as Promise<{ data: AluguelAtividade[] | null; error: unknown }>,

    // Receita dos últimos 6 meses para gráfico
    supabase.from('alugueis')
      .select('valor, mes_referencia, imovel:imoveis!inner(user_id)')
      .eq('status', 'pago')
      .eq('imovel.user_id', user.id)
      .gte('mes_referencia', sixMonthsAgoStr)
      .lte('mes_referencia', mesAtual) as unknown as Promise<{ data: AluguelReceita[] | null; error: unknown }>,

    // Imóveis para preview de cobranças futuras
    supabase.from('imoveis')
      .select('id, apelido, valor_aluguel, dia_vencimento, data_inicio_contrato, inquilinos(nome, ativo)')
      .eq('user_id', user.id)
      .eq('ativo', true) as unknown as Promise<{ data: ImovelParaPreview[] | null; error: unknown }>,
  ])

  // Totais do mês selecionado
  const totalReceber  = alugueisMes?.filter(a => a.status !== 'cancelado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const totalRecebido = alugueisMes?.filter(a => a.status === 'pago').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const totalAtrasado = alugueisMes?.filter(a => a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const qtdImoveisAtivos = imoveisAtivos?.length ?? 0
  const qtdPagos     = alugueisMes?.filter(a => a.status === 'pago').length ?? 0
  const qtdAtrasados = alugueisMes?.filter(a => a.status === 'atrasado').length ?? 0

  // Totais do mês anterior para tendência
  const prevReceber  = alugueisMesPrev?.filter(a => a.status !== 'cancelado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const prevRecebido = alugueisMesPrev?.filter(a => a.status === 'pago').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0
  const prevAtrasado = alugueisMesPrev?.filter(a => a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0) ?? 0

  const trendReceber  = calcTrend(totalReceber, prevReceber)
  const trendRecebido = calcTrend(totalRecebido, prevRecebido)
  const trendAtrasado = calcTrend(totalAtrasado, prevAtrasado)

  // Cobranças previstas para os próximos 2 meses
  type ItemPreview = { apelido: string; inquilino: string; valor: number; dia: number }
  type MesPreview  = { mes: string; mesLabel: string; total: number; items: ItemPreview[] }

  const proximasCobrancas: MesPreview[] = [1, 2].map(delta => {
    const d = new Date(hoje.getFullYear(), hoje.getMonth() + delta, 1)
    const mes = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    const items: ItemPreview[] = (imoveisParaPreview ?? [])
      .filter(imovel => {
        if (!imovel.data_inicio_contrato) return true
        return mes >= imovel.data_inicio_contrato.slice(0, 7)
      })
      .map(imovel => ({
        apelido:    imovel.apelido,
        inquilino:  imovel.inquilinos?.find(i => i.ativo)?.nome ?? 'Sem inquilino',
        valor:      imovel.valor_aluguel,
        dia:        imovel.dia_vencimento,
      }))
    return {
      mes,
      mesLabel: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
      total:    items.reduce((s, i) => s + i.valor, 0),
      items,
    }
  }).filter(m => m.items.length > 0)

  // Saudação
  const horaLocal = (hoje.getUTCHours() - 3 + 24) % 24
  const saudacao = horaLocal < 12 ? 'Bom dia' : horaLocal < 18 ? 'Boa tarde' : 'Boa noite'
  const primeiroNome = (profile as { nome?: string } | null)?.nome?.split(' ')[0] ?? ''

  // Label do mês selecionado
  const labelMes = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(selectedYear, selectedMonth - 1, 1))
  const labelMesCap = labelMes.charAt(0).toUpperCase() + labelMes.slice(1)

  // Revenue chart data — group by month
  const revenueByMonth: Record<string, number> = {}
  receitaMeses?.forEach(a => {
    const key = a.mes_referencia.substring(0, 7)
    revenueByMonth[key] = (revenueByMonth[key] ?? 0) + (a.valor ?? 0)
  })

  const chartData: RevenueDataPoint[] = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(selectedYear, selectedMonth - 1 - (5 - i), 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const mesLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(d)
    return {
      mes: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', ''),
      mesLabel: mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1),
      total: revenueByMonth[key] ?? 0,
    }
  })

  // Vencimentos visíveis (máx 3 + "Ver mais")
  const vencimentosVisiveis = (proximosVencimentos ?? []).slice(0, 3)
  const temMaisVencimentos = (proximosVencimentos?.length ?? 0) > 3

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Dashboard</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {saudacao}{primeiroNome ? `, ${primeiroNome}` : ''} — Resumo de {labelMesCap}
          </p>
        </div>
        <MonthSelector value={selectedMesKey} />
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          titulo="Total a receber"
          valor={formatarMoeda(totalReceber)}
          descricao="no mês selecionado"
          icon={TrendingUp}
          cor="padrao"
          tendencia={trendReceber}
        />
        <StatCard
          titulo="Recebido"
          valor={formatarMoeda(totalRecebido)}
          descricao={`${qtdPagos} pagamento${qtdPagos !== 1 ? 's' : ''}`}
          icon={CheckCircle}
          cor="verde"
          tendencia={trendRecebido}
        />
        <StatCard
          titulo="Em atraso"
          valor={formatarMoeda(totalAtrasado)}
          descricao={`${qtdAtrasados} pagamento${qtdAtrasados !== 1 ? 's' : ''}`}
          icon={AlertCircle}
          cor="vermelho"
          todoEmDia={totalAtrasado === 0}
          tendencia={trendAtrasado}
        />
        <StatCard
          titulo="Imóveis ativos"
          valor={String(qtdImoveisAtivos)}
          descricao="cadastrados e ativos"
          icon={Building2}
          cor="padrao"
        />
      </div>

      {/* Layout 60/40 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_auto] xl:grid-cols-[3fr_2fr]">
        {/* Coluna esquerda — Aluguéis do mês */}
        <Card className="flex flex-col">
          <CardHeader className="pb-0 pt-4 px-5">
            <CardTitle className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
              <Banknote className="h-4 w-4" />Aluguéis do mês
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 mt-2 flex-1">
            {!alugueisList?.length ? (
              <p className="px-5 py-6 text-sm text-[#94A3B8] text-center">Nenhum aluguel neste mês.</p>
            ) : (
              <div className="divide-y divide-[#F1F5F9]">
                {alugueisList.map(aluguel => {
                  const st = STATUS_CONFIG[aluguel.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pendente
                  const atraso = aluguel.status === 'atrasado' ? diasAtraso(aluguel.data_vencimento) : 0
                  const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                  const iniciais = nomeInq.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase()
                  const isPago = aluguel.status === 'pago'

                  return (
                    <div
                      key={aluguel.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      {/* Coluna 1: avatar + nome + imóvel */}
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0', corAvatar(nomeInq))}>
                        {iniciais}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate leading-tight">{nomeInq}</p>
                        <p className="text-xs text-slate-400 truncate leading-tight">{aluguel.imovel?.apelido}</p>
                      </div>

                      {/* Coluna 2: data vencimento */}
                      <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400 shrink-0 w-24 justify-end">
                        <Calendar className="h-3 w-3 shrink-0" />
                        {aluguel.data_pagamento
                          ? <span className="text-emerald-600">{formatarData(aluguel.data_pagamento)}</span>
                          : formatarData(aluguel.data_vencimento)
                        }
                      </div>

                      {/* Coluna 3: badge status */}
                      <div className="shrink-0 flex flex-col items-end gap-0.5">
                        <Badge className={cn('text-xs font-semibold', st.badgeCls)}>{st.label}</Badge>
                        {atraso > 0 && <span className="text-[10px] text-[#991B1B] font-medium">{atraso}d</span>}
                      </div>

                      {/* Coluna 4: valor */}
                      <div className={cn(
                        'text-sm font-bold shrink-0 w-20 text-right',
                        isPago ? 'text-emerald-600' : 'text-slate-600',
                      )}>
                        {formatarMoeda(aluguel.valor)}
                      </div>

                      {/* Coluna 5: ação rápida */}
                      <div className="shrink-0">
                        <AluguelAcaoBtn aluguelId={aluguel.id} status={aluguel.status} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>

          {/* Rodapé com link */}
          <div className="px-5 py-3 border-t border-slate-100 flex justify-end">
            <Link
              href="/alugueis"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Ver todos os aluguéis
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </Card>

        {/* Coluna direita — empilhada */}
        <div className="space-y-4">
          {/* Próximos vencimentos */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Calendar className="h-4 w-4" />Próximos 7 dias
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              {!proximosVencimentos?.length ? (
                <div className="flex flex-col items-center justify-center gap-1.5 px-5 py-6">
                  <CheckCircle className="h-6 w-6 text-emerald-500" />
                  <p className="text-sm font-semibold text-slate-700">Tudo em dia</p>
                  <p className="text-xs text-slate-400 text-center">Nenhum vencimento nos próximos 7 dias</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-[#F1F5F9]">
                    {vencimentosVisiveis.map(aluguel => {
                      const dias = diasParaVencer(aluguel.data_vencimento)
                      const urg = urgenciaBadge(dias, aluguel.status)
                      return (
                        <div key={aluguel.id} className="flex items-center gap-3 px-5 py-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#0F172A] truncate leading-tight">
                              {aluguel.imovel?.apelido ?? 'Imóvel'}
                            </p>
                            <p className="text-xs text-slate-400 truncate leading-tight">
                              {aluguel.inquilino?.nome ?? 'Sem inquilino'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold', urg.cls)}>
                              {urg.label}
                            </span>
                            <p className="text-sm font-bold text-[#0F172A] w-18 text-right">
                              {formatarMoeda(aluguel.valor)}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  {temMaisVencimentos && (
                    <div className="px-5 py-2 border-t border-slate-100">
                      <Link href="/alugueis" className="text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                        Ver mais →
                      </Link>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Atividade recente */}
          <Card>
            <CardHeader className="pb-0 pt-4 px-5">
              <CardTitle className="text-sm font-semibold text-[#94A3B8] uppercase tracking-wider flex items-center gap-2">
                <Activity className="h-4 w-4" />Atividade recente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 mt-2">
              {!atividadeRecente?.length ? (
                <p className="px-5 py-4 text-sm text-[#94A3B8] text-center">Nenhum pagamento recente.</p>
              ) : (
                <div className="divide-y divide-[#F1F5F9]">
                  {atividadeRecente.map(aluguel => {
                    const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                    const [ano, mes] = aluguel.mes_referencia.split('-').map(Number)
                    const labelMesAtiv = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
                      .format(new Date(ano, mes - 1, 1))
                    const iconCfg = ATIVIDADE_ICON_CONFIG.pagamento
                    return (
                      <div key={aluguel.id} className="flex items-center gap-3 px-5 py-3">
                        {/* Ícone colorido */}
                        <div className={cn('h-8 w-8 rounded-full flex items-center justify-center shrink-0', iconCfg.bg)}>
                          <CheckCircle className={cn('h-3.5 w-3.5', iconCfg.text)} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#0F172A] truncate leading-tight">{nomeInq}</p>
                          <p className="text-[11px] text-slate-400 truncate leading-tight">
                            {aluguel.imovel?.apelido} · {labelMesAtiv}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <p className="text-xs font-bold text-emerald-600">+{formatarMoeda(aluguel.valor)}</p>
                          {aluguel.data_pagamento && (
                            <p className="text-[10px] text-slate-400">{tempoRelativo(aluguel.data_pagamento)}</p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reajustes próximos */}
          {(proximosReajustes?.length ?? 0) > 0 && (
            <ReajusteAlertas imoveis={(proximosReajustes ?? []) as import('@/components/dashboard/reajuste-alertas').ImovelReajuste[]} />
          )}
        </div>
      </div>

      {/* Cobranças previstas — próximos 2 meses */}
      {proximasCobrancas.length > 0 && (
        <Card>
          <CardHeader className="pt-5 px-6 pb-2">
            <div className="flex items-baseline justify-between gap-4">
              <div>
                <CardTitle className="text-base font-semibold text-[#0F172A]">Cobranças previstas</CardTitle>
                <p className="text-xs text-slate-400 mt-0.5">Previsão calculada a partir dos imóveis ativos</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5 pt-2">
            <div className="grid gap-4 sm:grid-cols-2">
              {proximasCobrancas.map(m => (
                <Link
                  key={m.mes}
                  href={`/alugueis?mes=${m.mes}`}
                  className="rounded-xl border border-slate-100 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-100 transition-colors p-4 block group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-emerald-700">{m.mesLabel}</span>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-emerald-700">{formatarMoeda(m.total)}</span>
                  </div>
                  <div className="space-y-1.5">
                    {m.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate max-w-[60%]">
                          {item.apelido}
                          <span className="text-slate-400"> · {item.inquilino}</span>
                        </span>
                        <span className="font-medium text-slate-600 shrink-0 ml-2">
                          dia {item.dia} · {formatarMoeda(item.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-emerald-600 font-medium mt-3 group-hover:underline">
                    Ver cobranças de {m.mesLabel.split(' ')[0].toLowerCase()} →
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráfico de receita — largura total */}
      <Card>
        <CardHeader className="pt-5 px-6 pb-2">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <CardTitle className="text-base font-semibold text-[#0F172A]">
                Receita dos últimos 6 meses
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">Total recebido por mês</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 pb-5 pt-2">
          <RevenueChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  )
}
