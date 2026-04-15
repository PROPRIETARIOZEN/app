'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Activity, Search, RefreshCw, Download, ChevronLeft, ChevronRight, X,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────
type LogRow = {
  id: string
  user_id: string
  action: string
  entity_type: string | null
  entity_id: string | null
  details: unknown
  ip_address: string | null
  created_at: string
  user_nome: string
  user_email: string
}
type Summary = {
  eventos_hoje: number
  logins_hoje: number
  upgrades_mes: number
  cancelamentos_mes: number
}

// ─── Action badge colors ──────────────────────────────────────────────────────
const ACTION_STYLES: Record<string, string> = {
  LOGIN:           'bg-slate-100 text-slate-700 border-slate-200',
  IMOVEL_CRIADO:   'bg-blue-100 text-blue-700 border-blue-200',
  INQUILINO_CRIADO:'bg-indigo-100 text-indigo-700 border-indigo-200',
  ALUGUEL_PAGO:    'bg-emerald-100 text-emerald-700 border-emerald-200',
  UPGRADE_PRO:     'bg-amber-100 text-amber-700 border-amber-200',
  CANCELAMENTO:    'bg-red-100 text-red-700 border-red-200',
  ADMIN_ACAO:      'bg-purple-100 text-purple-700 border-purple-200',
  COBRANCA_GERADA: 'bg-cyan-100 text-cyan-700 border-cyan-200',
}

const ACTION_LABELS: Record<string, string> = {
  LOGIN:           'Login',
  IMOVEL_CRIADO:   'Imóvel criado',
  INQUILINO_CRIADO:'Inquilino criado',
  ALUGUEL_PAGO:    'Aluguel pago',
  UPGRADE_PRO:     'Upgrade PRO',
  CANCELAMENTO:    'Cancelamento',
  ADMIN_ACAO:      'Ação admin',
  COBRANCA_GERADA: 'Cobrança gerada',
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLES[action] ?? 'bg-slate-100 text-slate-700 border-slate-200'
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${style}`}>
      {ACTION_LABELS[action] ?? action}
    </span>
  )
}

function formatDateTime(s: string) {
  const d = new Date(s)
  const dia = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace(' de ', ' ')
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return `${dia} às ${hora}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminLogsPage() {
  const [search, setSearch]       = useState('')
  const [action, setAction]       = useState('todos')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [page, setPage]           = useState(1)
  const [loading, setLoading]     = useState(false)
  const [data, setData]           = useState<LogRow[]>([])
  const [summary, setSummary]     = useState<Summary | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal]         = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (
    s: string, a: string, df: string, dt: string, p: number
  ) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (s.trim()) params.set('user_id', s.trim())
      if (a !== 'todos') params.set('action', a)
      if (df) params.set('date_from', df)
      if (dt) params.set('date_to', dt)
      const res = await fetch(`/api/admin/logs?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setData(json.data ?? [])
      setSummary(json.summary ?? null)
      setTotalPages(json.pagination?.total_pages ?? 1)
      setTotal(json.pagination?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(
      () => fetchData(search, action, dateFrom, dateTo, page), 400
    )
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, action, dateFrom, dateTo, page, fetchData])

  function clearFilters() {
    setSearch(''); setAction('todos'); setDateFrom(''); setDateTo(''); setPage(1)
  }

  const hasFilters = search || action !== 'todos' || dateFrom || dateTo

  function exportCSV() {
    const header = 'Data,Ação,Usuário,Email,IP,Entidade,ID Entidade'
    const rows = data.map(r => [
      formatDateTime(r.created_at),
      r.action,
      r.user_nome,
      r.user_email,
      r.ip_address ?? '',
      r.entity_type ?? '',
      r.entity_id ?? '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'logs.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-slate-100 flex items-center justify-center">
          <Activity className="h-5 w-5 text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Logs & Atividade</h1>
          <p className="text-sm text-[#64748B]">Auditoria de eventos do sistema</p>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Eventos hoje</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{summary.eventos_hoje}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Logins hoje</p>
            <p className="text-2xl font-bold text-slate-600 mt-1">{summary.logins_hoje}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Upgrades PRO no mês</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.upgrades_mes}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Cancelamentos no mês</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{summary.cancelamentos_mes}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Filtrar por user ID…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={action} onValueChange={v => { setAction(v ?? 'todos'); setPage(1) }}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas ações</SelectItem>
            <SelectItem value="LOGIN">Login</SelectItem>
            <SelectItem value="IMOVEL_CRIADO">Imóvel criado</SelectItem>
            <SelectItem value="INQUILINO_CRIADO">Inquilino criado</SelectItem>
            <SelectItem value="ALUGUEL_PAGO">Aluguel pago</SelectItem>
            <SelectItem value="UPGRADE_PRO">Upgrade PRO</SelectItem>
            <SelectItem value="CANCELAMENTO">Cancelamento</SelectItem>
            <SelectItem value="ADMIN_ACAO">Ação admin</SelectItem>
            <SelectItem value="COBRANCA_GERADA">Cobrança gerada</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={e => { setDateFrom(e.target.value); setPage(1) }}
          className="h-9 w-36 text-sm"
          placeholder="De"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={e => { setDateTo(e.target.value); setPage(1) }}
          className="h-9 w-36 text-sm"
          placeholder="Até"
        />
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5 text-[#64748B]">
            <X className="h-3.5 w-3.5" /> Limpar
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fetchData(search, action, dateFrom, dateTo, page)} className="h-9">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                {['Data', 'Ação', 'Usuário', 'Entidade', 'IP', 'Detalhes'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                  </td></tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <Activity className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-[#94A3B8] text-sm">
                    {hasFilters ? 'Nenhum log encontrado com esses filtros.' : 'Nenhum log registrado ainda.'}
                  </p>
                  {hasFilters && (
                    <button onClick={clearFilters} className="mt-2 text-xs text-blue-600 hover:underline">
                      Limpar filtros
                    </button>
                  )}
                </td></tr>
              ) : data.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                    {formatDateTime(row.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={row.action} />
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-medium text-[#0F172A]">{row.user_nome || '—'}</p>
                    <p className="text-xs text-[#94A3B8] truncate max-w-40">{row.user_email || row.user_id.slice(0, 8) + '…'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">
                    {row.entity_type ? (
                      <span>
                        <span className="font-medium">{row.entity_type}</span>
                        {row.entity_id && (
                          <span className="text-[#94A3B8] ml-1">{row.entity_id.slice(0, 8)}…</span>
                        )}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#94A3B8] font-mono">
                    {row.ip_address ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B] max-w-48">
                    {row.details != null ? (
                      <span className="font-mono text-[10px] truncate block max-w-full" title={JSON.stringify(row.details)}>
                        {JSON.stringify(row.details as object).slice(0, 60)}
                        {JSON.stringify(row.details as object).length > 60 ? '…' : ''}
                      </span>
                    ) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#64748B]">
        <span>{total} evento{total !== 1 ? 's' : ''}</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="h-8 w-8 p-0">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="h-8 w-8 p-0">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
