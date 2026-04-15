'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, AlertTriangle, Receipt, FileText,
  Banknote, Building2, ChevronLeft, ChevronRight,
  Calendar, Filter, MoreHorizontal, X, CheckCheck,
  AlertCircle, TrendingUp, Zap, XCircle, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { PagarModal } from './pagar-modal'
import { marcarReciboGerado } from '@/app/(dashboard)/alugueis/actions'
import { formatarMoeda } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export type AluguelItem = {
  id: string
  valor: number
  data_vencimento: string
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'estornado'
  mes_referencia: string
  observacao: string | null
  recibo_gerado: boolean
  imovel: { apelido: string; endereco: string; billing_mode?: string | null } | null
  inquilino: { nome: string; cpf: string | null; email: string | null; telefone: string | null } | null
  // Campos Asaas (preenchidos quando billing_mode = AUTOMATIC)
  asaas_charge_id: string | null
  asaas_pix_qrcode: string | null
  asaas_pix_copiaecola: string | null
  asaas_boleto_url: string | null
  valor_pago: number | null
  metodo_pagamento: string | null
}

type Profile = { nome: string; email: string; telefone: string | null }

const STATUS_CONFIG = {
  pago:      { label: 'Pago',      icon: CheckCircle2,  badgeCls: 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]' },
  pendente:  { label: 'Pendente',  icon: Clock,          badgeCls: 'bg-[#FEF3C7] text-[#92400E] hover:bg-[#FEF3C7]' },
  atrasado:  { label: 'Atrasado',  icon: AlertTriangle,  badgeCls: 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FEE2E2]' },
  cancelado: { label: 'Cancelado', icon: X,              badgeCls: 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#F1F5F9]' },
  estornado: { label: 'Estornado', icon: AlertCircle,    badgeCls: 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#F1F5F9]' },
}

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-violet-100 text-violet-700',
  'bg-cyan-100 text-cyan-700',
]

const PAGE_SIZE = 10

function corAvatar(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length]
}

function diasAtraso(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.max(0, Math.floor((hoje.getTime() - venc.getTime()) / 86400000))
}

function diasParaVencer(dataVencimento: string): number {
  const venc = new Date(dataVencimento + 'T00:00:00')
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  return Math.ceil((venc.getTime() - hoje.getTime()) / 86400000)
}

function labelMes(valor: string): string {
  const [ano, mes] = valor.split('-').map(Number)
  const label = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(ano, mes - 1, 1))
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function navegarMes(atual: string, delta: number): string {
  const [ano, mes] = atual.split('-').map(Number)
  const d = new Date(ano, mes - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatarDataCurta(data: string): string {
  const d = new Date(data + 'T00:00:00')
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' })
    .format(d)
    .replace('.', '')
}

// Vencimento cell with urgency indicator
function VencimentoCell({ aluguel }: { aluguel: AluguelItem }) {
  if (aluguel.status === 'pago') {
    return (
      <span className="text-slate-400 line-through text-xs">
        {formatarDataCurta(aluguel.data_vencimento)}
      </span>
    )
  }

  const dias = diasParaVencer(aluguel.data_vencimento)

  if (aluguel.status === 'atrasado' || dias < 0) {
    const d = diasAtraso(aluguel.data_vencimento)
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
        <span className="text-xs font-medium text-red-600">
          {formatarDataCurta(aluguel.data_vencimento)}
          <span className="block text-[10px] font-normal">{d}d em atraso</span>
        </span>
      </div>
    )
  }

  if (dias === 0) {
    return (
      <div className="flex items-center gap-1">
        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
        <span className="text-xs font-medium text-amber-600">
          {formatarDataCurta(aluguel.data_vencimento)}
          <span className="block text-[10px] font-normal">Vence hoje</span>
        </span>
      </div>
    )
  }

  if (dias <= 3) {
    return (
      <span className="text-xs font-medium text-amber-600">
        {formatarDataCurta(aluguel.data_vencimento)}
        <span className="block text-[10px] font-normal text-amber-500">em {dias}d</span>
      </span>
    )
  }

  return (
    <span className="text-xs text-slate-600">
      {formatarDataCurta(aluguel.data_vencimento)}
    </span>
  )
}

// Cobrança column — shows Asaas state when available, else placeholder
function CobrancaCell({ aluguel }: { aluguel: AluguelItem }) {
  const [pixOpen, setPixOpen] = useState(false)

  // Sem cobrança Asaas
  if (!aluguel.asaas_charge_id) {
    return <span className="text-slate-300 text-sm">—</span>
  }

  // Pago via Asaas: exibe método
  if (aluguel.status === 'pago' && aluguel.metodo_pagamento) {
    const label = aluguel.metodo_pagamento === 'PIX' ? 'PIX'
      : aluguel.metodo_pagamento === 'BOLETO' ? 'Boleto'
      : aluguel.metodo_pagamento
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold gap-1">
        <CheckCircle2 className="h-2.5 w-2.5" />
        {label}
      </Badge>
    )
  }

  // Cancelado ou estornado
  if (aluguel.status === 'cancelado' || aluguel.status === 'estornado') {
    return <span className="text-slate-400 text-xs">—</span>
  }

  // Pendente / atrasado com cobrança ativa: mostrar ações PIX / boleto
  return (
    <div className="flex items-center gap-1">
      {/* PIX: botão que abre dialog com QR code */}
      {aluguel.asaas_pix_copiaecola && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); setPixOpen(true) }}
            className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
            title="Ver PIX copia e cola"
          >
            PIX
          </button>

          {pixOpen && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
              onClick={() => setPixOpen(false)}
            >
              <div
                className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">PIX copia e cola</h3>
                  <button onClick={() => setPixOpen(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {aluguel.asaas_pix_qrcode && (
                  <div className="flex justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`data:image/png;base64,${aluguel.asaas_pix_qrcode}`}
                      alt="QR Code PIX"
                      className="h-44 w-44 rounded-lg border"
                    />
                  </div>
                )}

                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 break-all text-xs font-mono text-slate-600 select-all">
                  {aluguel.asaas_pix_copiaecola}
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(aluguel.asaas_pix_copiaecola!)
                      .then(() => toast.success('Código PIX copiado!'))
                      .catch(() => toast.error('Não foi possível copiar.'))
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 transition-colors"
                >
                  Copiar código PIX
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Boleto */}
      {aluguel.asaas_boleto_url && (
        <a
          href={aluguel.asaas_boleto_url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-0.5 rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
          title="Ver boleto"
        >
          Boleto
        </a>
      )}
    </div>
  )
}

export function AlugueisClient({
  alugueis,
  mesSelecionado,
  profile,
}: {
  alugueis: AluguelItem[]
  mesSelecionado: string
  profile: Profile
}) {
  const router = useRouter()

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [pagando, setPagando] = useState<AluguelItem | null>(null)
  const [loadingRecibo, setLoadingRecibo] = useState<string | null>(null)
  const [loadingCobranca, setLoadingCobranca] = useState<string | null>(null)

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pago' | 'pendente' | 'atrasado' | 'cancelado' | 'estornado'>('todos')
  const [filtroImovel, setFiltroImovel] = useState<string>('todos')

  // Pagination state
  const [pagina, setPagina] = useState(1)

  // Bulk selection state
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  // Close filter panel on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    if (filterOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  // Reset pagination when filters change
  useEffect(() => { setPagina(1) }, [filtroStatus, filtroImovel, mesSelecionado])

  // Unique imóveis from loaded data
  const imoveisUnicos = useMemo(() => {
    const map = new Map<string, string>()
    alugueis.forEach(a => {
      if (a.imovel?.apelido) map.set(a.imovel.apelido, a.imovel.apelido)
    })
    return Array.from(map.values()).sort()
  }, [alugueis])

  // Filtered list
  const filtrados = useMemo(() => {
    return alugueis.filter(a => {
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
      if (filtroImovel !== 'todos' && a.imovel?.apelido !== filtroImovel) return false
      return true
    })
  }, [alugueis, filtroStatus, filtroImovel])

  // Pagination
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const paginados = filtrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE)

  // Summary counts (from full list, not filtered)
  const totalPago     = alugueis.filter(a => a.status === 'pago').reduce((s, a) => s + a.valor, 0)
  const totalPendente = alugueis.filter(a => a.status === 'pendente').reduce((s, a) => s + a.valor, 0)
  const totalAtrasado = alugueis.filter(a => a.status === 'atrasado').reduce((s, a) => s + a.valor, 0)
  const qtdPago       = alugueis.filter(a => a.status === 'pago').length
  const qtdPendente   = alugueis.filter(a => a.status === 'pendente').length
  const qtdAtrasado   = alugueis.filter(a => a.status === 'atrasado').length

  // Bulk selection helpers
  const allPageIds = paginados.map(a => a.id)
  const allPageSelected = allPageIds.length > 0 && allPageIds.every(id => selecionados.has(id))
  const somePageSelected = allPageIds.some(id => selecionados.has(id))

  function toggleSelectAll() {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (allPageSelected) allPageIds.forEach(id => next.delete(id))
      else allPageIds.forEach(id => next.add(id))
      return next
    })
  }

  function toggleSelect(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function limparSelecao() { setSelecionados(new Set()) }

  // Handlers
  function handlePagar(aluguel: AluguelItem) { setPagando(aluguel); setModalOpen(true) }

  async function handleGerarRecibo(aluguel: AluguelItem) {
    setLoadingRecibo(aluguel.id)
    try {
      const { gerarReciboPDF } = await import('@/lib/pdf')
      gerarReciboPDF({
        pagamento: {
          id: aluguel.id, valor: aluguel.valor, mes_referencia: aluguel.mes_referencia,
          data_vencimento: aluguel.data_vencimento, data_pagamento: aluguel.data_pagamento,
          status: aluguel.status, observacao: aluguel.observacao,
          imovel: { apelido: aluguel.imovel?.apelido ?? '', endereco: aluguel.imovel?.endereco ?? '' },
          inquilino: aluguel.inquilino ?? { nome: 'Sem inquilino', cpf: null, email: null, telefone: null },
        },
        proprietario: profile,
      })
      const result = await marcarReciboGerado(aluguel.id)
      if (result.error) toast.error(result.error)
      else toast.success('Recibo gerado!')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao gerar recibo PDF')
    } finally { setLoadingRecibo(null) }
  }

  async function handleGerarCobranca(aluguel: AluguelItem) {
    setLoadingCobranca(aluguel.id)
    try {
      const res = await fetch('/api/asaas/cobranca/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aluguelId: aluguel.id }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao gerar cobrança')
        return
      }
      toast.success('Cobrança gerada com sucesso!')
      router.refresh()
    } catch {
      toast.error('Erro ao gerar cobrança')
    } finally {
      setLoadingCobranca(null)
    }
  }

  async function handleCancelarCobranca(aluguel: AluguelItem) {
    setLoadingCobranca(aluguel.id)
    try {
      const res = await fetch('/api/asaas/cobranca/cancelar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aluguelId: aluguel.id }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao cancelar cobrança')
        return
      }
      toast.success('Cobrança cancelada')
      router.refresh()
    } catch {
      toast.error('Erro ao cancelar cobrança')
    } finally {
      setLoadingCobranca(null)
    }
  }

  const activeFilters = (filtroStatus !== 'todos' ? 1 : 0) + (filtroImovel !== 'todos' ? 1 : 0)

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Aluguéis</h1>
          <p className="text-sm text-[#475569] mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0">
            <span>{alugueis.length} registro{alugueis.length !== 1 ? 's' : ''}</span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-600 font-medium">{qtdPago} pago{qtdPago !== 1 ? 's' : ''}</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-600 font-medium">{qtdPendente} pendente{qtdPendente !== 1 ? 's' : ''}</span>
            {qtdAtrasado > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-red-600 font-medium">{qtdAtrasado} em atraso</span>
              </>
            )}
          </p>
        </div>

        {/* Right controls: month nav + filter */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Month navigation */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(`/alugueis?mes=${navegarMes(mesSelecionado, -1)}`)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold text-[#0F172A] w-40 text-center select-none">
              {labelMes(mesSelecionado)}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => router.push(`/alugueis?mes=${navegarMes(mesSelecionado, +1)}`)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter button + dropdown panel */}
          <div className="relative" ref={filterRef}>
            <Button
              variant="outline"
              size="sm"
              className={cn('h-8 gap-1.5 text-sm', activeFilters > 0 && 'border-emerald-500 text-emerald-600')}
              onClick={() => setFilterOpen(v => !v)}
            >
              <Filter className="h-3.5 w-3.5" />
              Filtrar
              {activeFilters > 0 && (
                <span className="inline-flex items-center justify-center h-4 w-4 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  {activeFilters}
                </span>
              )}
            </Button>

            {filterOpen && (
              <div className="absolute right-0 top-10 z-30 w-56 bg-white rounded-xl border border-slate-200 shadow-lg p-3 space-y-3">
                {/* Status filter */}
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Status</p>
                  <div className="flex flex-col gap-0.5">
                    {(['todos', 'pago', 'pendente', 'atrasado', 'cancelado', 'estornado'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setFiltroStatus(s)}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors',
                          filtroStatus === s
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'hover:bg-slate-50 text-slate-700',
                        )}
                      >
                        {filtroStatus === s && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                        {filtroStatus !== s && <span className="h-3 w-3 shrink-0" />}
                        {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Imóvel filter */}
                {imoveisUnicos.length > 1 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Imóvel</p>
                    <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto">
                      <button
                        onClick={() => setFiltroImovel('todos')}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors',
                          filtroImovel === 'todos'
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'hover:bg-slate-50 text-slate-700',
                        )}
                      >
                        {filtroImovel === 'todos' && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                        {filtroImovel !== 'todos' && <span className="h-3 w-3 shrink-0" />}
                        Todos os imóveis
                      </button>
                      {imoveisUnicos.map(nome => (
                        <button
                          key={nome}
                          onClick={() => setFiltroImovel(nome)}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors truncate',
                            filtroImovel === nome
                              ? 'bg-emerald-50 text-emerald-700 font-medium'
                              : 'hover:bg-slate-50 text-slate-700',
                          )}
                        >
                          {filtroImovel === nome && <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />}
                          {filtroImovel !== nome && <span className="h-3 w-3 shrink-0" />}
                          <span className="truncate">{nome}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeFilters > 0 && (
                  <button
                    onClick={() => { setFiltroStatus('todos'); setFiltroImovel('todos') }}
                    className="w-full text-xs text-slate-400 hover:text-slate-600 py-1 transition-colors"
                  >
                    Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard
          titulo="Recebido"
          valor={formatarMoeda(totalPago)}
          descricao={`${qtdPago} pago${qtdPago !== 1 ? 's' : ''}`}
          icon={CheckCircle2}
          cor="verde"
        />
        <StatCard
          titulo="Pendente"
          valor={formatarMoeda(totalPendente)}
          descricao={`${qtdPendente} aguardando`}
          icon={Clock}
          cor="amarelo"
          todoEmDia={totalPendente === 0}
          zeroText="Nenhum pendente"
        />
        <StatCard
          titulo="Em atraso"
          valor={formatarMoeda(totalAtrasado)}
          descricao={`${qtdAtrasado} em atraso`}
          icon={AlertCircle}
          cor="vermelho"
          todoEmDia={totalAtrasado === 0}
          zeroText="Nenhum em atraso"
        />
        <StatCard
          titulo="Total mês"
          valor={formatarMoeda(totalPago + totalPendente + totalAtrasado)}
          descricao={`${alugueis.length} imóve${alugueis.length !== 1 ? 'is' : 'l'}`}
          icon={TrendingUp}
          cor="padrao"
        />
      </div>

      {/* Table card */}
      {alugueis.length === 0 ? (
        <Card>
          <CardContent className="p-0">
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <div className="p-3 rounded-full bg-slate-100">
                <Calendar className="h-10 w-10 text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[#0F172A]">
                  Nenhum aluguel em {labelMes(mesSelecionado)}
                </p>
                <p className="text-xs text-slate-400 max-w-[280px]">
                  Os aluguéis são gerados automaticamente quando você cadastra um imóvel com inquilino ativo.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => router.push('/imoveis')} className="mt-1">
                <Building2 className="h-4 w-4 mr-1.5" />
                Ir para Imóveis
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[36px_2fr_1.5fr_100px_80px_110px_90px_72px] gap-3 px-5 items-center bg-slate-50 border-b border-slate-100 h-10">
            <div className="flex items-center justify-center">
              <input
                type="checkbox"
                checked={allPageSelected}
                ref={el => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
                onChange={toggleSelectAll}
                className="h-3.5 w-3.5 rounded border-slate-300 text-emerald-600 cursor-pointer accent-emerald-600"
              />
            </div>
            {['Inquilino', 'Imóvel', 'Vencimento', 'Status', 'Cobrança', 'Valor', 'Ações'].map(col => (
              <span key={col} className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500 truncate">
                {col}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {filtrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                <Filter className="h-6 w-6 text-slate-300" />
                <p className="text-sm text-slate-500 font-medium">Nenhum resultado</p>
                <p className="text-xs text-slate-400">Tente remover algum filtro aplicado.</p>
              </div>
            ) : (
              paginados.map(aluguel => {
                const st = STATUS_CONFIG[aluguel.status]
                const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                const iniciais = nomeInq.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                const isPago = aluguel.status === 'pago'
                const isFinalizado = aluguel.status === 'cancelado' || aluguel.status === 'estornado'
                const isSelected = selecionados.has(aluguel.id)

                return (
                  <div
                    key={aluguel.id}
                    className={cn(
                      'group flex flex-col md:grid md:grid-cols-[36px_2fr_1.5fr_100px_80px_110px_90px_72px] md:gap-3 px-5 py-4 md:py-0 md:h-16 md:items-center hover:bg-slate-50 transition-colors',
                      isPago && 'opacity-[0.92]',
                      isSelected && 'bg-emerald-50/60 hover:bg-emerald-50/80',
                    )}
                  >
                    {/* Checkbox */}
                    <div className="hidden md:flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(aluguel.id)}
                        className="h-3.5 w-3.5 rounded border-slate-300 cursor-pointer accent-emerald-600"
                      />
                    </div>

                    {/* Inquilino */}
                    <div className="flex items-center gap-2.5 min-w-0 mb-2 md:mb-0">
                      <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0', corAvatar(nomeInq))}>
                        {iniciais}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#0F172A] truncate leading-tight">{nomeInq}</p>
                        {aluguel.inquilino?.email && (
                          <p className="text-[12px] text-slate-400 truncate leading-tight">{aluguel.inquilino.email}</p>
                        )}
                      </div>
                    </div>

                    {/* Imóvel */}
                    <div className="min-w-0 mb-2 md:mb-0">
                      <p className="text-sm font-medium text-slate-700 truncate leading-tight">{aluguel.imovel?.apelido ?? '—'}</p>
                      {aluguel.recibo_gerado && (
                        <p className="text-[11px] text-slate-400 flex items-center gap-0.5 leading-tight">
                          <FileText className="h-2.5 w-2.5" />recibo emitido
                        </p>
                      )}
                    </div>

                    {/* Vencimento */}
                    <div className="mb-2 md:mb-0">
                      <VencimentoCell aluguel={aluguel} />
                    </div>

                    {/* Status */}
                    <div className="mb-2 md:mb-0">
                      <Badge className={cn('text-xs font-semibold', st.badgeCls)}>{st.label}</Badge>
                    </div>

                    {/* Cobrança */}
                    <div className="mb-2 md:mb-0">
                      <CobrancaCell aluguel={aluguel} />
                    </div>

                    {/* Valor */}
                    <div className="mb-2 md:mb-0">
                      <span className={cn(
                        'text-sm font-bold',
                        isPago ? 'text-emerald-600'
                          : aluguel.status === 'atrasado' ? 'text-red-600'
                          : isFinalizado ? 'text-slate-400 line-through'
                          : 'text-slate-700',
                      )}>
                        {formatarMoeda(aluguel.valor)}
                      </span>
                    </div>

                    {/* Ações dropdown */}
                    <div className="flex items-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          className="inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          {isPago ? (
                            <>
                              <DropdownMenuItem
                                disabled={loadingRecibo === aluguel.id}
                                onSelect={() => handleGerarRecibo(aluguel)}
                              >
                                <Receipt className="h-3.5 w-3.5 mr-2" />
                                {aluguel.recibo_gerado ? 'Ver recibo' : 'Gerar recibo'}
                              </DropdownMenuItem>
                            </>
                          ) : isFinalizado ? (
                            <DropdownMenuItem disabled>
                              <AlertCircle className="h-3.5 w-3.5 mr-2 text-slate-400" />
                              {aluguel.status === 'cancelado' ? 'Cobrança cancelada' : 'Cobrança estornada'}
                            </DropdownMenuItem>
                          ) : (
                            <>
                              {aluguel.imovel?.billing_mode === 'AUTOMATIC' && (
                                <>
                                  {!aluguel.asaas_charge_id ? (
                                    <DropdownMenuItem
                                      disabled={loadingCobranca === aluguel.id}
                                      onSelect={() => handleGerarCobranca(aluguel)}
                                    >
                                      {loadingCobranca === aluguel.id
                                        ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                        : <Zap className="h-3.5 w-3.5 mr-2 text-amber-500" />
                                      }
                                      Gerar cobrança Asaas
                                    </DropdownMenuItem>
                                  ) : (
                                    <DropdownMenuItem
                                      disabled={loadingCobranca === aluguel.id}
                                      onSelect={() => handleCancelarCobranca(aluguel)}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      {loadingCobranca === aluguel.id
                                        ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                        : <XCircle className="h-3.5 w-3.5 mr-2" />
                                      }
                                      Cancelar cobrança
                                    </DropdownMenuItem>
                                  )}
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              {aluguel.imovel?.billing_mode !== 'AUTOMATIC' && (
                                <>
                                  <DropdownMenuItem onSelect={() => handlePagar(aluguel)}>
                                    <Banknote className="h-3.5 w-3.5 mr-2" />
                                    Registrar pagamento
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                </>
                              )}
                              <DropdownMenuItem onSelect={() => handlePagar(aluguel)}>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                                Marcar como pago
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Table footer: count + pagination */}
          {filtrados.length > 0 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
              <p className="text-[13px] text-slate-400">
                Exibindo{' '}
                <span className="font-medium text-slate-600">
                  {Math.min((paginaAtual - 1) * PAGE_SIZE + 1, filtrados.length)}–{Math.min(paginaAtual * PAGE_SIZE, filtrados.length)}
                </span>{' '}
                de{' '}
                <span className="font-medium text-slate-600">{filtrados.length}</span>{' '}
                registro{filtrados.length !== 1 ? 's' : ''}
              </p>

              {totalPaginas > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    disabled={paginaAtual === 1}
                    onClick={() => setPagina(p => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>

                  {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(p => (
                    <Button
                      key={p}
                      variant={p === paginaAtual ? 'default' : 'outline'}
                      size="sm"
                      className={cn('h-7 w-7 p-0 text-xs', p === paginaAtual && 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600')}
                      onClick={() => setPagina(p)}
                    >
                      {p}
                    </Button>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 text-xs"
                    disabled={paginaAtual === totalPaginas}
                    onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      <PagarModal open={modalOpen} onOpenChange={setModalOpen} aluguel={pagando} />

      {/* Bulk action bar */}
      {selecionados.size > 0 && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-5 py-3 bg-slate-900 text-white rounded-xl shadow-xl"
          style={{ animation: 'slideUp 0.2s ease-out' }}
        >
          <span className="text-sm font-medium">
            {selecionados.size} registro{selecionados.size !== 1 ? 's' : ''} selecionado{selecionados.size !== 1 ? 's' : ''}
          </span>

          {/* "Marcar como pagos" only if all selected are pending/overdue */}
          {Array.from(selecionados).every(id => {
            const a = alugueis.find(x => x.id === id)
            return a && a.status !== 'pago'
          }) && (
            <Button
              size="sm"
              className="h-7 bg-emerald-500 hover:bg-emerald-400 text-white border-0 gap-1.5 text-xs"
              onClick={limparSelecao}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar como pagos
            </Button>
          )}

          <button
            onClick={limparSelecao}
            className="h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  )
}
