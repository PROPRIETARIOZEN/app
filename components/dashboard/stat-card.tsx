import { cn } from '@/lib/utils'
import { CheckCircle, TrendingUp, TrendingDown } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  titulo: string
  valor: string
  descricao?: string
  icon: LucideIcon
  cor?: 'padrao' | 'verde' | 'vermelho' | 'amarelo' | 'azul'
  todoEmDia?: boolean
  tendencia?: { percentual: number; positivo: boolean } | null
}

const coresMap = {
  padrao:   { iconWrap: 'bg-emerald-500/15 text-emerald-600' },
  verde:    { iconWrap: 'bg-emerald-500/15 text-emerald-600' },
  vermelho: { iconWrap: 'bg-red-500/15 text-red-600' },
  amarelo:  { iconWrap: 'bg-amber-500/15 text-amber-600' },
  azul:     { iconWrap: 'bg-blue-500/15 text-blue-600' },
}

export function StatCard({
  titulo,
  valor,
  descricao,
  icon: Icon,
  cor = 'padrao',
  todoEmDia,
  tendencia,
}: StatCardProps) {
  const cores = coresMap[cor]

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] py-5 px-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] flex flex-col gap-3">
      {/* Top row: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500"
          style={{ marginBottom: 0 }}
        >
          {titulo}
        </p>
        <div className={cn('h-9 w-9 rounded-full flex items-center justify-center shrink-0', cores.iconWrap)}>
          <Icon className="h-[18px] w-[18px]" />
        </div>
      </div>

      {/* Value */}
      <div>
        {todoEmDia ? (
          <div className="flex items-center gap-1.5">
            <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
            <span className="text-[18px] font-bold text-emerald-600 leading-none">Tudo em dia</span>
          </div>
        ) : (
          <p className="text-[28px] font-bold tracking-tight text-[#0F172A] leading-none">{valor}</p>
        )}
        {descricao && !todoEmDia && (
          <p className="text-[13px] text-slate-400 mt-1.5">{descricao}</p>
        )}
      </div>

      {/* Trend footer */}
      {tendencia !== undefined && (
        <div className="flex items-center gap-1 pt-0.5 border-t border-slate-100">
          {tendencia === null ? (
            <span className="text-[11px] text-slate-400">sem dados do mês anterior</span>
          ) : tendencia.positivo ? (
            <>
              <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
              <span className="text-[11px] font-medium text-emerald-600">+{tendencia.percentual}%</span>
              <span className="text-[11px] text-slate-400">vs mês anterior</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-red-400 shrink-0" />
              <span className="text-[11px] font-medium text-red-500">−{tendencia.percentual}%</span>
              <span className="text-[11px] text-slate-400">vs mês anterior</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
