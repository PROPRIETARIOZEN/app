'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

type ChartEntry = {
  mes: string
  label: string
  pago: number
  pendente: number
  atrasado: number
}

type TipProps = {
  active?: boolean
  payload?: { dataKey?: string; value?: number; color?: string }[]
  label?: string
}

const LABELS: Record<string, string> = {
  pago:     'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
}

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v)
}

function CustomTooltip({ active, payload, label }: TipProps) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 shadow-md text-xs space-y-1">
      <p className="font-semibold text-[#0F172A] mb-1">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-[#64748B]">{LABELS[p.dataKey ?? ''] ?? p.dataKey}:</span>
          <span className="font-medium text-[#0F172A]">{formatBRL(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  )
}

export function AlugueisChart({ data }: { data: ChartEntry[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: 8, bottom: 0 }} barSize={20} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) =>
            v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
          }
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9' }} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: '#64748b' }}
          formatter={(value: string) => LABELS[value] ?? value}
        />
        <Bar dataKey="pago"     stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
        <Bar dataKey="pendente" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
        <Bar dataKey="atrasado" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
