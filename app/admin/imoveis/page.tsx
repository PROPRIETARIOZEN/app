'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Building2, Search, RefreshCw, Download, ChevronLeft, ChevronRight,
  TrendingDown, AlertTriangle, CheckCircle, Home,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AlugueisChart } from '@/components/admin/alugueis-chart'

// ─── Types ────────────────────────────────────────────────────────────────────
type ImovelRow = {
  id: string; apelido: string; endereco: string; tipo: string
  valor_aluguel: number | null; ativo: boolean; billing_mode: string | null
  criado_em: string; owner_nome: string; owner_email: string; tem_inquilino: boolean
}
type ImovelSummary = {
  total: number; total_ativos: number; total_inativos: number; vagos_count: number
  valor_medio: number; por_tipo: Record<string, number>
}
type AluguelRow = {
  id: string; mes_referencia: string; valor: number | null; valor_pago: number | null
  status: string; data_pagamento: string | null; imovel_nome: string
  owner_nome: string; owner_email: string; inquilino_nome: string
}
type AluguelSummary = {
  total_emitido_mes: number; total_recebido_mes: number
  count_atrasados: number; 'total_atrasado_r$': number
}
type ChartEntry = { mes: string; label: string; pago: number; pendente: number; atrasado: number }
type InadimplRow = {
  id: string; mes_referencia: string; valor: number | null; dias_atraso: number
  imovel_nome: string; owner_nome: string; owner_email: string; inquilino_nome: string
}
type InadimplSummary = {
  'total_inadimplencia_r$': number; count_atrasados: number
  top_proprietarios: { id: string; nome: string; email: string; total: number; count: number }[]
  top_imoveis: { id: string; nome: string; total: number; count: number }[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString('pt-BR')
}
function statusBadge(s: string) {
  const map: Record<string, string> = {
    pago:     'bg-emerald-100 text-emerald-700 border-emerald-200',
    pendente: 'bg-amber-100 text-amber-700 border-amber-200',
    atrasado: 'bg-red-100 text-red-700 border-red-200',
  }
  const labels: Record<string, string> = { pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado' }
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${map[s] ?? 'bg-slate-100 text-slate-700 border-slate-200'}`}>
      {labels[s] ?? s}
    </span>
  )
}
function tipoBadge(t: string) {
  const labels: Record<string, string> = {
    apartamento: 'Apto', casa: 'Casa', kitnet: 'Kitnet',
    comercial: 'Comercial', terreno: 'Terreno', outro: 'Outro',
  }
  return (
    <span className="inline-flex items-center rounded bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
      {labels[t] ?? t}
    </span>
  )
}

// ─── Tab: Imóveis ─────────────────────────────────────────────────────────────
function TabImoveis() {
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState('todos')
  const [ativo, setAtivo] = useState('todos')
  const [ordenar, setOrdenar] = useState('mais_recentes')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<ImovelRow[]>([])
  const [summary, setSummary] = useState<ImovelSummary | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchData = useCallback(async (s: string, t: string, a: string, o: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(p), search: s,
        ...(t !== 'todos' ? { tipo: t } : {}),
        ...(a !== 'todos' ? { ativo: a } : {}),
        ordenar: o,
      })
      const res = await fetch(`/api/admin/imoveis?${params}`)
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
    debounceRef.current = setTimeout(() => fetchData(search, tipo, ativo, ordenar, page), 400)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [search, tipo, ativo, ordenar, page, fetchData])

  function exportCSV() {
    const header = 'Apelido,Endereço,Tipo,Valor,Ativo,Tem Inquilino,Proprietário,Email,Criado em'
    const rows = data.map(r => [
      r.apelido, r.endereco, r.tipo,
      r.valor_aluguel ?? '',
      r.ativo ? 'Sim' : 'Não',
      r.tem_inquilino ? 'Sim' : 'Não',
      r.owner_nome, r.owner_email,
      formatDate(r.criado_em),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'imoveis.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Total de imóveis</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{summary.total}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">{summary.total_ativos} ativos</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Vagos</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{summary.vagos_count}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">sem inquilino ativo</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Valor médio</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{formatBRL(summary.valor_medio)}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">dos ativos</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Inativos</p>
            <p className="text-2xl font-bold text-slate-400 mt-1">{summary.total_inativos}</p>
            <p className="text-xs text-[#94A3B8] mt-0.5">arquivados</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
          <Input
            placeholder="Buscar apelido ou endereço…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select value={tipo} onValueChange={v => { setTipo(v ?? 'todos'); setPage(1) }}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos tipos</SelectItem>
            <SelectItem value="apartamento">Apartamento</SelectItem>
            <SelectItem value="casa">Casa</SelectItem>
            <SelectItem value="kitnet">Kitnet</SelectItem>
            <SelectItem value="comercial">Comercial</SelectItem>
            <SelectItem value="terreno">Terreno</SelectItem>
            <SelectItem value="outro">Outro</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ativo} onValueChange={v => { setAtivo(v ?? 'todos'); setPage(1) }}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="ativo">Ativos</SelectItem>
            <SelectItem value="inativo">Inativos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ordenar} onValueChange={v => { setOrdenar(v ?? 'mais_recentes'); setPage(1) }}>
          <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mais_recentes">Mais recentes</SelectItem>
            <SelectItem value="mais_antigos">Mais antigos</SelectItem>
            <SelectItem value="maior_valor">Maior valor</SelectItem>
            <SelectItem value="menor_valor">Menor valor</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fetchData(search, tipo, ativo, ordenar, page)} className="h-9">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                {['Imóvel', 'Tipo', 'Valor', 'Status', 'Inquilino', 'Proprietário', 'Criado em'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                  </td></tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[#94A3B8] text-sm">Nenhum imóvel encontrado.</td></tr>
              ) : data.map(row => (
                <tr key={row.id} className={`hover:bg-slate-50 transition-colors ${!row.ativo ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-[#0F172A]">{row.apelido}</p>
                    <p className="text-xs text-[#94A3B8] truncate max-w-48">{row.endereco}</p>
                  </td>
                  <td className="px-4 py-3">{tipoBadge(row.tipo)}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A]">
                    {row.valor_aluguel ? formatBRL(row.valor_aluguel) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {row.ativo
                      ? <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle className="h-3 w-3" /> Ativo</span>
                      : <span className="inline-flex items-center gap-1 text-xs text-slate-500"><AlertTriangle className="h-3 w-3" /> Inativo</span>
                    }
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {row.tem_inquilino
                      ? <span className="text-emerald-600">Ocupado</span>
                      : <span className="text-amber-600">Vago</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[#0F172A] text-xs font-medium">{row.owner_nome}</p>
                    <p className="text-[#94A3B8] text-xs">{row.owner_email}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">
                    {formatDate(row.criado_em)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-[#64748B]">
        <span>{total} imóvel{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}</span>
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

// ─── Tab: Aluguéis ────────────────────────────────────────────────────────────
function TabAlugueis() {
  const [mes, setMes] = useState('')
  const [status, setStatus] = useState('todos')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AluguelRow[]>([])
  const [summary, setSummary] = useState<AluguelSummary | null>(null)
  const [chart, setChart] = useState<ChartEntry[]>([])
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchData = useCallback(async (m: string, s: string, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        view: 'lista', page: String(p),
        ...(m ? { mes: m } : {}),
        ...(s !== 'todos' ? { status: s } : {}),
      })
      const res = await fetch(`/api/admin/alugueis?${params}`)
      if (!res.ok) return
      const json = await res.json()
      setData(json.data ?? [])
      setSummary(json.summary ?? null)
      setChart(json.chart_history ?? [])
      setTotalPages(json.pagination?.total_pages ?? 1)
      setTotal(json.pagination?.total ?? 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData(mes, status, page) }, [mes, status, page, fetchData])

  function exportCSV() {
    const header = 'Mês,Status,Valor,Pago,Pagamento,Imóvel,Inquilino,Proprietário'
    const rows = data.map(r => [
      r.mes_referencia.slice(0, 7), r.status,
      r.valor ?? '', r.valor_pago ?? '',
      r.data_pagamento ? formatDate(r.data_pagamento) : '',
      r.imovel_nome, r.inquilino_nome, r.owner_nome,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    const csv = '\uFEFF' + [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'alugueis.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Emitido no mês</p>
            <p className="text-2xl font-bold text-[#0F172A] mt-1">{formatBRL(summary.total_emitido_mes)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Recebido no mês</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatBRL(summary.total_recebido_mes)}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Cobranças atrasadas</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{summary.count_atrasados}</p>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B]">Total em atraso</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{formatBRL(summary['total_atrasado_r$'])}</p>
          </CardContent></Card>
        </div>
      )}

      {/* Chart */}
      {chart.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-[#0F172A]">Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent><AlugueisChart data={chart} /></CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          type="month"
          value={mes}
          onChange={e => { setMes(e.target.value); setPage(1) }}
          className="h-9 w-40 text-sm"
        />
        <Select value={status} onValueChange={v => { setStatus(v ?? 'todos'); setPage(1) }}>
          <SelectTrigger className="h-9 w-32 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="atrasado">Atrasado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={exportCSV} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button variant="ghost" size="sm" onClick={() => fetchData(mes, status, page)} className="h-9">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                {['Mês', 'Imóvel', 'Inquilino', 'Status', 'Valor', 'Pago', 'Proprietário'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td></tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[#94A3B8] text-sm">Nenhum aluguel encontrado.</td></tr>
              ) : data.map(row => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-[#64748B] whitespace-nowrap">{row.mes_referencia.slice(0, 7)}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A] text-xs">{row.imovel_nome}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">{row.inquilino_nome || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(row.status)}</td>
                  <td className="px-4 py-3 text-xs font-medium text-[#0F172A]">{row.valor ? formatBRL(row.valor) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-emerald-700 font-medium">{row.valor_pago ? formatBRL(row.valor_pago) : '—'}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">{row.owner_nome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-[#64748B]">
        <span>{total} registro{total !== 1 ? 's' : ''}</span>
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

// ─── Tab: Inadimplência ───────────────────────────────────────────────────────
function TabInadimplencia() {
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<InadimplRow[]>([])
  const [summary, setSummary] = useState<InadimplSummary | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchData = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/alugueis?view=inadimplencia&page=${p}`)
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

  useEffect(() => { fetchData(page) }, [page, fetchData])

  return (
    <div className="space-y-4">
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-red-200 bg-red-50"><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-red-500" />
              <p className="text-xs text-red-700 font-medium">Total em atraso</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{formatBRL(summary['total_inadimplencia_r$'])}</p>
          </CardContent></Card>

          <Card className="border-amber-200 bg-amber-50"><CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-amber-700 font-medium">Cobranças atrasadas</p>
            </div>
            <p className="text-2xl font-bold text-amber-700">{summary.count_atrasados}</p>
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B] mb-2">Top proprietários</p>
            {summary.top_proprietarios.slice(0, 3).map(p => (
              <div key={p.id} className="flex justify-between items-center text-xs py-0.5">
                <span className="text-[#0F172A] truncate max-w-28">{p.nome}</span>
                <span className="text-red-600 font-medium shrink-0">{formatBRL(p.total)}</span>
              </div>
            ))}
          </CardContent></Card>

          <Card><CardContent className="p-4">
            <p className="text-xs text-[#64748B] mb-2">Top imóveis</p>
            {summary.top_imoveis.slice(0, 3).map(im => (
              <div key={im.id} className="flex justify-between items-center text-xs py-0.5">
                <span className="text-[#0F172A] truncate max-w-28">{im.nome}</span>
                <span className="text-red-600 font-medium shrink-0">{formatBRL(im.total)}</span>
              </div>
            ))}
          </CardContent></Card>
        </div>
      )}

      <div className="rounded-lg border border-[#E2E8F0] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                {['Mês', 'Imóvel', 'Inquilino', 'Valor', 'Dias em atraso', 'Proprietário'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-4 py-3">
                    <div className="h-4 bg-slate-100 rounded animate-pulse" />
                  </td></tr>
                ))
              ) : data.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-[#94A3B8] text-sm">
                  Nenhuma inadimplência encontrada.
                </td></tr>
              ) : data.map(row => (
                <tr key={row.id} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-4 py-3 text-xs text-[#64748B]">{row.mes_referencia.slice(0, 7)}</td>
                  <td className="px-4 py-3 font-medium text-[#0F172A] text-xs">{row.imovel_nome}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">{row.inquilino_nome || '—'}</td>
                  <td className="px-4 py-3 text-xs font-medium text-red-600">{row.valor ? formatBRL(row.valor) : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${row.dias_atraso > 30 ? 'text-red-600' : 'text-amber-600'}`}>
                      {row.dias_atraso} dias
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-[#0F172A] font-medium">{row.owner_nome}</p>
                    <p className="text-xs text-[#94A3B8]">{row.owner_email}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-[#64748B]">
        <span>{total} registro{total !== 1 ? 's' : ''}</span>
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

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function AdminImoveisPage() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#0F172A]">Imóveis & Aluguéis</h1>
          <p className="text-sm text-[#64748B]">Visão completa da carteira de imóveis e cobranças</p>
        </div>
      </div>

      <Tabs defaultValue="imoveis">
        <TabsList className="bg-slate-100 p-1 rounded-xl h-10">
          <TabsTrigger value="imoveis" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
            <Home className="h-3.5 w-3.5" /> Imóveis
          </TabsTrigger>
          <TabsTrigger value="alugueis" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Aluguéis
          </TabsTrigger>
          <TabsTrigger value="inadimplencia" className="rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm gap-1.5">
            <TrendingDown className="h-3.5 w-3.5" /> Inadimplência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="imoveis" className="mt-4"><TabImoveis /></TabsContent>
        <TabsContent value="alugueis" className="mt-4"><TabAlugueis /></TabsContent>
        <TabsContent value="inadimplencia" className="mt-4"><TabInadimplencia /></TabsContent>
      </Tabs>
    </div>
  )
}
