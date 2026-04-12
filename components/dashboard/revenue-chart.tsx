'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'

export interface RevenueDataPoint {
  mes: string      // "Jan", "Fev"...
  mesLabel: string // "Janeiro de 2025"
  total: number
}

function formatarMoedaCompacta(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return String(value)
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: RevenueDataPoint }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.value)
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-slate-800">{formatted}</p>
      <p className="text-slate-400 text-xs capitalize">{item.payload.mesLabel}</p>
    </div>
  )
}

export function RevenueChart({ data }: { data: RevenueDataPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.total), 1)

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barCategoryGap="30%">
        <XAxis
          dataKey="mes"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94A3B8', fontWeight: 500 }}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: '#94A3B8' }}
          tickFormatter={formatarMoedaCompacta}
          width={36}
          domain={[0, maxVal * 1.15]}
        />
        <Tooltip
          content={(props) => (
            <CustomTooltip
              active={props.active}
              payload={(props.payload as unknown) as Array<{ value: number; payload: RevenueDataPoint }>}
            />
          )}
          cursor={{ fill: 'rgba(148,163,184,0.08)' }}
        />
        <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={48}>
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.total === 0 ? '#F1F5F9' : '#059669'}
              className={entry.total > 0 ? 'hover:fill-[#047857]' : ''}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
