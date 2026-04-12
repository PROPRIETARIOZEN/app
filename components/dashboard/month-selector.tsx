'use client'

import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MonthSelectorProps {
  value: string // "YYYY-MM"
}

export function MonthSelector({ value }: MonthSelectorProps) {
  const router = useRouter()

  const [y, m] = value.split('-').map(Number)
  const currentDate = new Date(y, m - 1, 1)

  const hoje = new Date()
  const isCurrent = y === hoje.getFullYear() && m === hoje.getMonth() + 1

  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(currentDate)
  const labelCap = label.charAt(0).toUpperCase() + label.slice(1)

  function navigate(delta: number) {
    const d = new Date(y, m - 1 + delta, 1)
    const newVal = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    router.push(`?mes=${newVal}`)
  }

  return (
    <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-lg px-1 py-1">
      <button
        onClick={() => navigate(-1)}
        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all"
        aria-label="Mês anterior"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm font-medium text-slate-700 px-2 min-w-[140px] text-center">
        {labelCap}
      </span>
      <button
        onClick={() => navigate(1)}
        disabled={isCurrent}
        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:bg-white hover:text-slate-800 hover:shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Próximo mês"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
