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

type Variant = 'pago' | 'parcial' | 'atrasado' | 'pendente' | 'futuro' | 'vazio'

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

function getVariant(s: MesStats, mesHoje: string): Variant {
  if (s.total === 0) return s.mes > mesHoje ? 'futuro' : 'vazio'
  if (s.qtdAtrasado > 0 && s.pago < s.total) return 'atrasado'
  if (s.pago >= s.total) return 'pago'
  if (s.pago > 0) return 'parcial'
  return 'pendente'
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CalendarioAnual({ data, ano }: {
  data: AnoResumoItem[]
  ano: number
}) {
  const stats = computeStats(data, ano)

  const hoje = new Date()
  const mesHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

  // Annual totals (only months with data)
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
          const variant = getVariant(s, mesHoje)
          const cfg = VARIANT_CFG[variant]
          const isAtual = s.mes === mesHoje

          // Valor a mostrar: se parcial, mostra o pago; senão mostra o total
          const valorExibido = s.pago > 0 ? s.pago : s.total

          return (
            <Link
              key={s.mes}
              href={`/alugueis?mes=${s.mes}`}
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
                  variant === 'vazio' || variant === 'futuro' ? 'text-slate-400' : 'text-slate-800',
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
                {s.total > 0 ? (
                  <>
                    <p className={cn('text-base font-bold leading-tight', cfg.valueColor)}>
                      {formatarMoeda(valorExibido)}
                    </p>
                    {/* Se parcial, mostra total riscado */}
                    {s.pago > 0 && s.pago < s.total && (
                      <p className="text-[11px] text-slate-400 line-through leading-tight">
                        {formatarMoeda(s.total)}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-300 font-medium">—</p>
                )}
              </div>

              {/* Status badge + contador */}
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                  cfg.badge,
                )}>
                  {cfg.icon}
                  {cfg.label}
                </span>
                {s.qtdTotal > 0 && (
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
          ['pago', 'Recebido'],
          ['parcial', 'Parcial'],
          ['atrasado', 'Atrasado'],
          ['pendente', 'Pendente'],
          ['futuro', 'Futuro'],
        ] as [Variant, string][]).map(([v, lbl]) => (
          <div key={v} className="flex items-center gap-1.5">
            <span className={cn('h-2 w-2 rounded-full', {
              'bg-emerald-400': v === 'pago',
              'bg-blue-400':    v === 'parcial',
              'bg-red-400':     v === 'atrasado',
              'bg-amber-400':   v === 'pendente',
              'bg-slate-300':   v === 'futuro',
            })} />
            <span className="text-[11px] text-slate-500">{lbl}</span>
          </div>
        ))}
        <span className="text-[11px] text-slate-400 ml-auto">Clique no mês para ver detalhes</span>
      </div>
    </div>
  )
}
