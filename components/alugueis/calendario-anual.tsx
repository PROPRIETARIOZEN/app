'use client'

import Link from 'next/link'
import {
  ChevronLeft, ChevronRight,
  CheckCircle2, Clock, AlertTriangle, Minus, TrendingUp,
} from 'lucide-react'
import { formatarMoeda } from '@/lib/helpers'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

export type AnoResumoItem = {
  valor: number
  status: string
  mes_referencia: string // YYYY-MM-DD (stored as first of month)
}

// Dados de vigência do imóvel — usados apenas para projeção visual.
// Não representam registros na tabela alugueis.
export type ImovelVigencia = {
  id: string
  valor_aluguel: number
  data_inicio_contrato: string | null
  data_fim_contrato: string | null
  contrato_indeterminado: boolean
}

type MesStats = {
  mes: string       // YYYY-MM
  total: number
  pago: number
  pendente: number
  atrasado: number
  qtdTotal: number
  qtdPago: number
  qtdAtrasado: number
}

type Variant = 'pago' | 'parcial' | 'atrasado' | 'pendente' | 'futuro' | 'vazio' | 'previsto'

// ─── Constants ────────────────────────────────────────────────────────────────

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

const VARIANT_CFG: Record<Variant, {
  card: string
  badge: string
  label: string
  valueColor: string
  icon: React.ReactNode
}> = {
  pago:     {
    card:       'bg-emerald-50 border-emerald-200 hover:bg-emerald-100/80',
    badge:      'bg-emerald-100 text-emerald-700',
    label:      'Recebido',
    valueColor: 'text-emerald-700',
    icon:       <CheckCircle2 className="h-2.5 w-2.5" />,
  },
  parcial:  {
    card:       'bg-blue-50 border-blue-200 hover:bg-blue-100/80',
    badge:      'bg-blue-100 text-blue-700',
    label:      'Parcial',
    valueColor: 'text-blue-700',
    icon:       <Clock className="h-2.5 w-2.5" />,
  },
  atrasado: {
    card:       'bg-red-50 border-red-200 hover:bg-red-100/80',
    badge:      'bg-red-100 text-red-700',
    label:      'Atrasado',
    valueColor: 'text-red-700',
    icon:       <AlertTriangle className="h-2.5 w-2.5" />,
  },
  pendente: {
    card:       'bg-amber-50 border-amber-200 hover:bg-amber-100/80',
    badge:      'bg-amber-100 text-amber-700',
    label:      'Pendente',
    valueColor: 'text-amber-700',
    icon:       <Clock className="h-2.5 w-2.5" />,
  },
  // Meses 'previsto' são projeções visuais baseadas na vigência do imóvel.
  // Não existem na tabela alugueis.
  // São exibidos apenas no CalendarioAnual para dar ao proprietário
  // uma visão completa do contrato.
  previsto: {
    card:       'bg-white border-dashed border-slate-200 hover:border-slate-300 opacity-75 hover:opacity-100',
    badge:      'bg-slate-100 text-slate-400',
    label:      'Previsto',
    valueColor: 'text-slate-400',
    icon:       <Minus className="h-2.5 w-2.5" />,
  },
  futuro:   {
    card:       'bg-slate-50 border-slate-100 hover:bg-slate-100/80',
    badge:      'bg-slate-100 text-slate-400',
    label:      'Futuro',
    valueColor: 'text-slate-300',
    icon:       <Minus className="h-2.5 w-2.5" />,
  },
  vazio:    {
    card:       'bg-slate-50 border-slate-100 hover:bg-slate-100/80',
    badge:      'bg-slate-100 text-slate-400',
    label:      '—',
    valueColor: 'text-slate-300',
    icon:       <Minus className="h-2.5 w-2.5" />,
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeStats(data: AnoResumoItem[], ano: number): MesStats[] {
  return Array.from({ length: 12 }, (_, i) => {
    const mes = `${ano}-${String(i + 1).padStart(2, '0')}`
    const items = data.filter(a => a.mes_referencia.startsWith(mes))
    return {
      mes,
      total:       items.reduce((s, a) => s + (a.valor ?? 0), 0),
      pago:        items.filter(a => a.status === 'pago').reduce((s, a) => s + (a.valor ?? 0), 0),
      pendente:    items.filter(a => a.status === 'pendente').reduce((s, a) => s + (a.valor ?? 0), 0),
      atrasado:    items.filter(a => a.status === 'atrasado').reduce((s, a) => s + (a.valor ?? 0), 0),
      qtdTotal:    items.length,
      qtdPago:     items.filter(a => a.status === 'pago').length,
      qtdAtrasado: items.filter(a => a.status === 'atrasado').length,
    }
  })
}

// Retorna a soma dos aluguéis projetados para um mês sem registro no banco
function computeValorPrevisto(mesISO: string, imoveis: ImovelVigencia[]): number {
  return imoveis
    .filter(im => {
      if (!im.data_inicio_contrato) return false
      const inicio = im.data_inicio_contrato.slice(0, 7)
      if (mesISO < inicio) return false
      if (im.contrato_indeterminado) return true
      if (!im.data_fim_contrato) return false
      return mesISO <= im.data_fim_contrato.slice(0, 7)
    })
    .reduce((s, im) => s + im.valor_aluguel, 0)
}

function getVariant(
  s: MesStats,
  mesHoje: string,
  imoveis: ImovelVigencia[],
): Variant {
  // Registro real existe → lógica original inalterada
  if (s.total > 0) {
    if (s.qtdAtrasado > 0 && s.pago < s.total) return 'atrasado'
    if (s.pago >= s.total) return 'pago'
    if (s.pago > 0) return 'parcial'
    return 'pendente'
  }

  // Sem registro — meses passados/atuais: vazio
  if (s.mes <= mesHoje) return 'vazio'

  // Mês futuro — verificar se algum imóvel tem vigência ativa
  const temVigencia = imoveis.some(im => {
    if (!im.data_inicio_contrato) return false
    const inicio = im.data_inicio_contrato.slice(0, 7)
    if (s.mes < inicio) return false
    if (im.contrato_indeterminado) return true
    if (!im.data_fim_contrato) return false
    return s.mes <= im.data_fim_contrato.slice(0, 7)
  })

  return temVigencia ? 'previsto' : 'futuro'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarioAnual({
  data,
  ano,
  imoveis = [],
}: {
  data: AnoResumoItem[]
  ano: number
  imoveis?: ImovelVigencia[]
}) {
  const stats = computeStats(data, ano)

  const hoje = new Date()
  const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  // Annual totals (only months with real records)
  const totalAnual = stats.reduce((s, m) => s + m.total, 0)
  const pagoAnual  = stats.reduce((s, m) => s + m.pago, 0)
  const pctAnual   = totalAnual > 0 ? Math.round((pagoAnual / totalAnual) * 100) : 0

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ── Header do calendário ── */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/60">
        <Link
          href={`/alugueis?view=calendario&ano=${ano - 1}`}
          className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          {ano - 1}
        </Link>

        <div className="text-center">
          <p className="text-lg font-bold text-slate-900">{ano}</p>
          {totalAnual > 0 && (
            <div className="flex items-center gap-1.5 justify-center mt-0.5">
              <TrendingUp className="h-3 w-3 text-emerald-500" />
              <p className="text-xs text-slate-500">
                <span className="font-semibold text-emerald-600">{formatarMoeda(pagoAnual)}</span>
                {' '}de{' '}
                <span className="font-medium text-slate-700">{formatarMoeda(totalAnual)}</span>
                {' '}({pctAnual}%)
              </p>
            </div>
          )}
        </div>

        <Link
          href={`/alugueis?view=calendario&ano=${ano + 1}`}
          className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
        >
          {ano + 1}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      {/* ── Grade de 12 meses ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 p-4">
        {stats.map((s, i) => {
          const variant  = getVariant(s, mesHoje, imoveis)
          const cfg      = VARIANT_CFG[variant]
          const isAtual  = s.mes === mesHoje
          const isPrevisto = variant === 'previsto'

          // Valor a exibir:
          // - Registro real parcial: valor pago
          // - Registro real: total
          // - Previsto: projeção calculada (sem registro no banco)
          const valorPrevisto = isPrevisto ? computeValorPrevisto(s.mes, imoveis) : 0
          const valorExibido  = isPrevisto ? valorPrevisto : (s.pago > 0 ? s.pago : s.total)

          return (
            <Link
              key={s.mes}
              href={`/alugueis?mes=${s.mes}`}
              title={isPrevisto
                ? 'Aluguel previsto com base na vigência do contrato. O registro será criado quando o mês chegar.'
                : undefined}
              className={cn(
                'relative rounded-xl border p-4 flex flex-col gap-2.5 transition-all',
                cfg.card,
                isAtual && 'ring-2 ring-emerald-400 ring-offset-1',
              )}
            >
              {/* Mês + badge "Atual" */}
              <div className="flex items-start justify-between gap-1">
                <span className={cn(
                  'text-sm font-semibold leading-tight',
                  variant === 'vazio' || variant === 'futuro' ? 'text-slate-400'
                    : variant === 'previsto' ? 'text-slate-500'
                    : 'text-slate-800',
                )}>
                  {MESES[i]}
                </span>
                {isAtual && (
                  <span className="shrink-0 text-[9px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full leading-none">
                    ATUAL
                  </span>
                )}
              </div>

              {/* Valor */}
              <div>
                {valorExibido > 0 ? (
                  <>
                    <p className={cn('text-base font-bold leading-tight', cfg.valueColor)}>
                      {formatarMoeda(valorExibido)}
                    </p>
                    {/* Se parcial, mostra total riscado */}
                    {!isPrevisto && s.pago > 0 && s.pago < s.total && (
                      <p className="text-[11px] text-slate-400 line-through leading-tight">
                        {formatarMoeda(s.total)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-300 font-medium">—</p>
                )}
              </div>

              {/* Status badge — sem contador para meses previstos */}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full font-semibold',
                  isPrevisto
                    ? 'text-[10px] uppercase tracking-[0.05em] border border-dashed border-slate-300 text-slate-400'
                    : 'text-[10px]',
                  !isPrevisto && cfg.badge,
                )}>
                  {!isPrevisto && cfg.icon}
                  {cfg.label}
                </span>
                {!isPrevisto && s.qtdTotal > 0 && (
                  <span className="text-[10px] text-slate-400">
                    {s.qtdPago}/{s.qtdTotal}
                  </span>
                )}
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Legenda ── */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-5 py-3 border-t border-slate-100 bg-slate-50/40">
        {([
          ['pago',     'Recebido',  'bg-emerald-400'],
          ['parcial',  'Parcial',   'bg-blue-400'],
          ['atrasado', 'Atrasado',  'bg-red-400'],
          ['pendente', 'Pendente',  'bg-amber-400'],
          ['previsto', 'Previsto',  'bg-slate-300 border border-dashed border-slate-400'],
          ['futuro',   'Futuro',    'bg-slate-200'],
        ] as [string, string, string][]).map(([v, lbl, dot]) => (
          <div key={v} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', dot)} />
            <span className={cn('text-[11px]', v === 'previsto' ? 'text-slate-400' : 'text-slate-500')}>{lbl}</span>
          </div>
        ))}
        <span className="text-[11px] text-slate-400 ml-auto">Clique no mês para ver detalhes</span>
      </div>
    </div>
  )
}
