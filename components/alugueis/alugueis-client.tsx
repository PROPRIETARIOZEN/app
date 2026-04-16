'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle2, Clock, AlertTriangle, Receipt, FileText,
  Banknote, Building2, ChevronLeft, ChevronRight,
  Calendar, Filter, MoreHorizontal, X, CheckCheck,
  AlertCircle, TrendingUp, Zap, Loader2, Paperclip,
  Mail, Tag, SplitSquareHorizontal, Ban, Gift, QrCode, Info,
  LayoutList, CalendarDays,
} from 'lucide-react'
import { DocumentosAluguel } from '@/components/documentos/DocumentosAluguel'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { StatCard } from '@/components/dashboard/stat-card'
import { PagarModal } from './pagar-modal'
import { CobrancaModal } from './cobranca-modal'
import { PagamentoParcialModal } from './pagamento-parcial-modal'
import { LembreteModal } from './lembrete-modal'
import { CancelarCobrancaModal } from './cancelar-cobranca-modal'
import { DescontoModal } from './desconto-modal'
import { IsentarModal } from './isentar-modal'
import { ReenviarReciboModal } from './reenviar-recibo-modal'
import { marcarReciboGerado } from '@/app/(dashboard)/alugueis/actions'
import { CalendarioAnual, type AnoResumoItem, type ImovelVigencia } from './calendario-anual'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { cn } from '@/lib/utils'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

type ActionModal =
  | { type: 'pagamento-parcial'; aluguel: AluguelItem }
  | { type: 'lembrete';          aluguel: AluguelItem }
  | { type: 'cancelar';          aluguel: AluguelItem }
  | { type: 'desconto';          aluguel: AluguelItem }
  | { type: 'isentar';           aluguel: AluguelItem }
  | { type: 'reenviar-recibo';   aluguel: AluguelItem }
  | null

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
  // Campos de gestão avançada
  desconto: number | null
  motivo_cancelamento: string | null
  isento: boolean | null
  motivo_isencao: string | null
  lembrete_enviado_em: string | null
  recibo_reenviado_em: string | null
}

type Profile = {
  nome: string
  email: string
  telefone: string | null
  plano: 'gratis' | 'pago' | 'elite'
  pix_key?: string | null
  pix_key_tipo?: string | null
}

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
  if (aluguel.status === 'cancelado' || aluguel.status === 'estornado') {
    return <span className="text-slate-400 text-xs">—</span>
  }

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

// ─── Cobrança column ───────────────────────────────────────────────────────────

function CobrancaButton({
  aluguel,
  onClick,
  onReenviar,
  loadingReenviar,
}: {
  aluguel: AluguelItem
  onClick: () => void
  onReenviar: () => void
  loadingReenviar: boolean
}) {
  // Cancelado / estornado → sem ação
  if (aluguel.status === 'cancelado' || aluguel.status === 'estornado') {
    return <span className="text-slate-300 text-xs">—</span>
  }

  const isAutomatic = aluguel.imovel?.billing_mode === 'AUTOMATIC'
  const temCharge = !!aluguel.asaas_charge_id

  // ── AUTOMATIC ──────────────────────────────────────────────────────────────
  if (isAutomatic) {
    // Estado C — pago via Asaas
    if (aluguel.status === 'pago') {
      return (
        <Badge
          title="Confirmado automaticamente pelo Asaas"
          className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold gap-1 cursor-default"
        >
          <CheckCircle2 className="h-2.5 w-2.5" />
          Confirmado
        </Badge>
      )
    }

    // Estado A — sem charge gerada (CPF pode estar ausente)
    if (!temCharge) {
      const semCpf = !aluguel.inquilino?.cpf
      if (semCpf) {
        return (
          <button
            onClick={e => { e.stopPropagation(); onClick() }}
            title="Cadastre o CPF do inquilino para gerar cobrança Asaas"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-700 transition-colors"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Sem CPF
          </button>
        )
      }
      return (
        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors whitespace-nowrap"
        >
          <Zap className="h-3.5 w-3.5 shrink-0" />
          Gerar PIX + Boleto
        </button>
      )
    }

    // Estado B — charge criada, aguardando pagamento
    return (
      <div className="flex flex-col gap-0.5">
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 text-[11px] font-semibold w-fit">
          Aguardando
        </Badge>
        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          className="text-[10px] text-slate-500 hover:text-slate-700 underline underline-offset-2"
        >
          Ver cobrança
        </button>
      </div>
    )
  }

  // ── MANUAL ─────────────────────────────────────────────────────────────────

  // Estado C — pago manualmente
  if (aluguel.status === 'pago') {
    return (
      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-[11px] font-semibold gap-1">
        <CheckCircle2 className="h-2.5 w-2.5" />
        Recebido
      </Badge>
    )
  }

  // Estado B — cobrança já enviada por e-mail
  if (aluguel.lembrete_enviado_em) {
    return (
      <div className="flex flex-col gap-0.5">
        <Badge
          title={`Cobrança enviada em ${formatarData(aluguel.lembrete_enviado_em)}`}
          className="bg-slate-100 text-slate-600 hover:bg-slate-100 text-[11px] font-semibold gap-1 cursor-default w-fit"
        >
          <CheckCheck className="h-2.5 w-2.5" />
          Enviado
        </Badge>
        <button
          onClick={e => { e.stopPropagation(); onReenviar() }}
          disabled={loadingReenviar}
          className="text-[10px] text-slate-500 hover:text-slate-700 underline underline-offset-2 flex items-center gap-0.5"
        >
          {loadingReenviar ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : null}
          Reenviar
        </button>
      </div>
    )
  }

  // Estado A — pendente/atrasado sem cobrança enviada
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors whitespace-nowrap"
    >
      <QrCode className="h-3.5 w-3.5 shrink-0" />
      Cobrar via PIX
    </button>
  )
}

// ─── AlugueisClient ────────────────────────────────────────────────────────────

export function AlugueisClient({
  alugueis,
  mesSelecionado,
  profile,
  cobrarId,
  view = 'lista',
  anoSelecionado,
  anoData = [],
  imoveisVigencia = [],
}: {
  alugueis: AluguelItem[]
  mesSelecionado: string
  profile: Profile
  cobrarId?: string | null
  view?: string
  anoSelecionado?: string
  anoData?: AnoResumoItem[]
  imoveisVigencia?: ImovelVigencia[]
}) {
  const router = useRouter()

  // Local copy of alugueis — updated optimistically without router.refresh()
  const [listaAlugueis, setListaAlugueis] = useState(alugueis)
  useEffect(() => { setListaAlugueis(alugueis) }, [alugueis])

  function atualizarAluguel(id: string, updates: Partial<AluguelItem>) {
    setListaAlugueis(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a))
  }

  // PagarModal state
  const [modalOpen, setModalOpen] = useState(false)
  const [pagando, setPagando] = useState<AluguelItem | null>(null)

  // CobrancaModal state
  const [cobrancaOpen, setCobrancaOpen] = useState(false)
  const [cobrancaAluguel, setCobrancaAluguel] = useState<AluguelItem | null>(null)
  const [loadingRecibo, setLoadingRecibo] = useState<string | null>(null)
  const [loadingCobranca, setLoadingCobranca] = useState<string | null>(null)
  const [loadingEmail, setLoadingEmail] = useState(false)
  const [loadingReenviarId, setLoadingReenviarId] = useState<string | null>(null)

  // Action modals
  const [actionModal, setActionModal] = useState<ActionModal>(null)
  function abrirModal(m: ActionModal) { setActionModal(m) }
  function fecharModal() { setActionModal(null) }

  // Cobrar todos modal
  const [cobraTodosOpen, setCobraTodosOpen] = useState(false)
  const [cobraProgresso, setCobraProgresso] = useState<{
    feitos: number; erros: number; total: number; status: 'idle' | 'running' | 'done'
  }>({ feitos: 0, erros: 0, total: 0, status: 'idle' })

  // Banner de orientação — localStorage
  const [bannerVisto, setBannerVisto] = useState(true) // true = hidden (evita flash no SSR)
  useEffect(() => {
    setBannerVisto(!!localStorage.getItem('alugueis_banner_visto'))
  }, [])

  // Tooltip pulsante nos 3 pontinhos — localStorage
  const [menuVisto, setMenuVisto] = useState(true)
  useEffect(() => {
    setMenuVisto(!!localStorage.getItem('alugueis_menu_visto'))
  }, [])

  // Filter state
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'pago' | 'pendente' | 'atrasado' | 'cancelado' | 'estornado'>('todos')
  const [filtroImovel, setFiltroImovel] = useState<string>('todos')

  // Pagination state
  const [pagina, setPagina] = useState(1)

  // Bulk selection state
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  // Documentos accordion
  const [abrirDocumentos, setAbrirDocumentos] = useState<string | null>(null)

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
    listaAlugueis.forEach(a => {
      if (a.imovel?.apelido) map.set(a.imovel.apelido, a.imovel.apelido)
    })
    return Array.from(map.values()).sort()
  }, [listaAlugueis])

  // Filtered list
  const filtrados = useMemo(() => {
    return listaAlugueis.filter(a => {
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false
      if (filtroImovel !== 'todos' && a.imovel?.apelido !== filtroImovel) return false
      return true
    })
  }, [listaAlugueis, filtroStatus, filtroImovel])

  // Pagination
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE))
  const paginaAtual = Math.min(pagina, totalPaginas)
  const paginados = filtrados.slice((paginaAtual - 1) * PAGE_SIZE, paginaAtual * PAGE_SIZE)

  // Summary counts (from full list, not filtered)
  const totalPago     = listaAlugueis.filter(a => a.status === 'pago').reduce((s, a) => s + a.valor, 0)
  const totalPendente = listaAlugueis.filter(a => a.status === 'pendente').reduce((s, a) => s + a.valor, 0)
  const totalAtrasado = listaAlugueis.filter(a => a.status === 'atrasado').reduce((s, a) => s + a.valor, 0)
  const qtdPago       = listaAlugueis.filter(a => a.status === 'pago').length
  const qtdPendente   = listaAlugueis.filter(a => a.status === 'pendente').length
  const qtdAtrasado   = listaAlugueis.filter(a => a.status === 'atrasado').length
  const qtdCancelado  = listaAlugueis.filter(a => a.status === 'cancelado').length
  const qtdEstornado  = listaAlugueis.filter(a => a.status === 'estornado').length

  // Pendentes sem cobrança enviada
  const semCobranca = useMemo(() =>
    listaAlugueis.filter(a =>
      (a.status === 'pendente' || a.status === 'atrasado') && !a.lembrete_enviado_em
    ), [listaAlugueis])

  const semCobrancaComEmail = useMemo(() =>
    semCobranca.filter(a => !!a.inquilino?.email),
    [semCobranca])

  const TABS = [
    { id: 'todos'     as const, label: 'Todos',     count: alugueis.length, cls: '' },
    { id: 'atrasado'  as const, label: 'Em atraso', count: qtdAtrasado,     cls: qtdAtrasado > 0 ? 'text-red-600' : '' },
    { id: 'pendente'  as const, label: 'Pendente',  count: qtdPendente,     cls: '' },
    { id: 'pago'      as const, label: 'Pago',      count: qtdPago,         cls: '' },
    ...(qtdCancelado > 0 ? [{ id: 'cancelado' as const, label: 'Cancelado', count: qtdCancelado, cls: '' }] : []),
    ...(qtdEstornado > 0 ? [{ id: 'estornado' as const, label: 'Estornado', count: qtdEstornado, cls: '' }] : []),
  ]

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

  // Handlers
  function handlePagar(aluguel: AluguelItem) { setPagando(aluguel); setModalOpen(true) }

  function handleAbrirCobranca(aluguel: AluguelItem) {
    setCobrancaAluguel(aluguel)
    setCobrancaOpen(true)
  }

  // Auto-abre o modal quando a URL contém ?cobrar=ID (ex: vindo do dashboard)
  useEffect(() => {
    if (!cobrarId) return
    const aluguel = listaAlugueis.find(a => a.id === cobrarId)
    if (aluguel) { setCobrancaAluguel(aluguel); setCobrancaOpen(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cobrarId])

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

  // Envia e-mail de cobrança a partir do CobrancaModal
  async function handleEnviarEmail(aluguel: AluguelItem) {
    setLoadingEmail(true)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/enviar-cobranca`, { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao enviar e-mail')
        return
      }
      toast.success('E-mail enviado com sucesso!')
      atualizarAluguel(aluguel.id, { lembrete_enviado_em: new Date().toISOString() })
    } catch {
      toast.error('Erro ao enviar e-mail')
    } finally {
      setLoadingEmail(false)
    }
  }

  // Reenvia e-mail diretamente do botão "Reenviar" na tabela
  async function handleReenviarEmail(aluguel: AluguelItem) {
    setLoadingReenviarId(aluguel.id)
    try {
      const res = await fetch(`/api/alugueis/${aluguel.id}/enviar-cobranca`, { method: 'POST' })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao reenviar e-mail')
        return
      }
      toast.success('E-mail reenviado!')
      atualizarAluguel(aluguel.id, { lembrete_enviado_em: new Date().toISOString() })
    } catch {
      toast.error('Erro ao reenviar e-mail')
    } finally {
      setLoadingReenviarId(null)
    }
  }

  // Cobrar todos — envia e-mail em sequência para cada pendente com e-mail
  async function handleCobrarTodos() {
    const targets = semCobrancaComEmail
    setCobraProgresso({ feitos: 0, erros: 0, total: targets.length, status: 'running' })

    let feitos = 0, erros = 0
    for (const aluguel of targets) {
      try {
        const res = await fetch(`/api/alugueis/${aluguel.id}/enviar-cobranca`, { method: 'POST' })
        if (res.ok) {
          feitos++
          atualizarAluguel(aluguel.id, { lembrete_enviado_em: new Date().toISOString() })
        } else {
          erros++
        }
      } catch {
        erros++
      }
      setCobraProgresso({ feitos, erros, total: targets.length, status: 'running' })
    }
    setCobraProgresso({ feitos, erros, total: targets.length, status: 'done' })
  }

  // ── Banner config ───────────────────────────────────────────────────────────
  const nenhumLembreteEnviado = listaAlugueis.every(a => !a.lembrete_enviado_em)
  const mostrarBanner = !bannerVisto && nenhumLembreteEnviado && listaAlugueis.length > 0
  const planoPago = profile.plano === 'pago' || profile.plano === 'elite'

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Aluguéis</h1>
          <p className="text-sm text-[#475569] mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0">
            <span>{listaAlugueis.length} registro{listaAlugueis.length !== 1 ? 's' : ''}</span>
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

        {/* Right controls: cobrar todos + month nav + filter + view toggle */}
        <div className="flex items-center gap-2 flex-wrap">

          {/* Cobrar todos + month nav + filter — only in list view */}
          {view !== 'calendario' && semCobranca.length > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 px-2.5 py-0.5 text-xs font-semibold">
                <AlertCircle className="h-3 w-3" />
                {semCobranca.length} sem cobrança
              </span>
              <button
                onClick={() => {
                  setCobraProgresso({ feitos: 0, erros: 0, total: 0, status: 'idle' })
                  setCobraTodosOpen(true)
                }}
                className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2 py-0.5 transition-colors"
              >
                Cobrar todos
              </button>
            </div>
          )}

          {/* Month navigation — list view only */}
          {view !== 'calendario' && <div className="flex items-center gap-1">
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
          </div>}

          {/* Imóvel filter — list view only, mais de 1 imóvel */}
          {view !== 'calendario' && imoveisUnicos.length > 1 && (
            <div className="relative" ref={filterRef}>
              <Button
                variant="outline"
                size="sm"
                className={cn('h-8 gap-1.5 text-sm', filtroImovel !== 'todos' && 'border-emerald-500 text-emerald-600')}
                onClick={() => setFilterOpen(v => !v)}
              >
                <Building2 className="h-3.5 w-3.5" />
                {filtroImovel === 'todos' ? 'Todos' : filtroImovel}
              </Button>

              {filterOpen && (
                <div className="absolute right-0 top-10 z-30 w-52 bg-white rounded-xl border border-slate-200 shadow-lg p-2">
                  <div className="flex flex-col gap-0.5 max-h-48 overflow-y-auto">
                    {(['todos', ...imoveisUnicos] as const).map(nome => (
                      <button
                        key={nome}
                        onClick={() => { setFiltroImovel(nome); setFilterOpen(false) }}
                        className={cn(
                          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-colors',
                          filtroImovel === nome
                            ? 'bg-emerald-50 text-emerald-700 font-medium'
                            : 'hover:bg-slate-50 text-slate-700',
                        )}
                      >
                        {filtroImovel === nome
                          ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          : <span className="h-3 w-3 shrink-0" />
                        }
                        <span className="truncate">{nome === 'todos' ? 'Todos os imóveis' : nome}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* View toggle — lista / calendário anual */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5">
            <button
              onClick={() => router.push(`/alugueis?mes=${mesSelecionado}`)}
              title="Lista"
              className={cn('rounded-md p-1.5 transition-colors', view !== 'calendario' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => router.push(`/alugueis?view=calendario&ano=${anoSelecionado ?? mesSelecionado.slice(0, 4)}`)}
              title="Visão anual"
              className={cn('rounded-md p-1.5 transition-colors', view === 'calendario' ? 'bg-slate-100 text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600')}
            >
              <CalendarDays className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Tabs de status — list view only */}
      {view === 'calendario' && (
        <CalendarioAnual
          data={anoData}
          ano={parseInt(anoSelecionado ?? mesSelecionado.slice(0, 4))}
          imoveis={imoveisVigencia}
        />
      )}

      {/* Tabs, stat cards, banner e tabela — apenas no modo lista */}
      {view !== 'calendario' && <>
      <div className="flex items-center gap-1 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFiltroStatus(tab.id)}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
              filtroStatus === tab.id
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border border-transparent',
            )}
          >
            <span className={filtroStatus !== tab.id ? tab.cls : ''}>{tab.label}</span>
            <span className={cn(
              'text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
              filtroStatus === tab.id
                ? 'bg-emerald-100 text-emerald-700'
                : tab.id === 'atrasado' && tab.count > 0
                  ? 'bg-red-100 text-red-600'
                  : 'bg-slate-100 text-slate-500',
            )}>
              {tab.count}
            </span>
          </button>
        ))}
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
          descricao={`${listaAlugueis.length} imóve${listaAlugueis.length !== 1 ? 'is' : 'l'}`}
          icon={TrendingUp}
          cor="padrao"
        />
      </div>

      {/* Banner de orientação — primeira vez na página, sem nenhuma cobrança enviada */}
      {mostrarBanner && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start gap-3">
          <Info className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            {planoPago ? (
              <p className="text-sm text-emerald-800 leading-relaxed">
                <span className="font-semibold">Como funciona:</span>{' '}
                clique em <span className="font-medium">&ldquo;Gerar Pix/Boleto&rdquo;</span> para criar a cobrança automática.
                O pagamento será confirmado automaticamente quando o inquilino pagar.
              </p>
            ) : (
              <p className="text-sm text-emerald-800 leading-relaxed">
                <span className="font-semibold">Como cobrar seu inquilino:</span>{' '}
                clique em <span className="font-medium">&ldquo;Cobrar via Pix&rdquo;</span> na linha do aluguel para gerar o
                QR Code e enviar por e-mail. Após receber, clique em{' '}
                <span className="font-medium">⋯ → Registrar pagamento</span> para confirmar.
              </p>
            )}
          </div>
          <button
            onClick={() => {
              localStorage.setItem('alugueis_banner_visto', '1')
              setBannerVisto(true)
            }}
            className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full text-emerald-500 hover:bg-emerald-100 hover:text-emerald-700 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Table card */}
      {listaAlugueis.length === 0 ? (
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
          <div className="hidden md:grid grid-cols-[36px_2fr_1.5fr_100px_80px_130px_90px_120px] gap-3 px-5 items-center bg-slate-50 border-b border-slate-100 h-10">
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
              paginados.map((aluguel, rowIndex) => {
                const st = STATUS_CONFIG[aluguel.status]
                const nomeInq = aluguel.inquilino?.nome ?? 'Sem inquilino'
                const iniciais = nomeInq.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
                const isPago = aluguel.status === 'pago'
                const isFinalizado = aluguel.status === 'cancelado' || aluguel.status === 'estornado'
                const isSelected = selecionados.has(aluguel.id)
                const isDocOpen = abrirDocumentos === aluguel.id
                // Tooltip pulsante: só no primeiro item da primeira página quando menu nunca foi aberto
                const isPrimeiro = !menuVisto && rowIndex === 0 && paginaAtual === 1

                function toggleDocumentos() {
                  setAbrirDocumentos(prev => prev === aluguel.id ? null : aluguel.id)
                }

                return (
                  <div key={aluguel.id}>
                  <div
                    className={cn(
                      'group flex flex-col md:grid md:grid-cols-[36px_2fr_1.5fr_100px_80px_130px_90px_120px] md:gap-3 px-5 py-4 md:py-0 md:h-16 md:items-center hover:bg-slate-50 transition-colors',
                      isPago && 'opacity-[0.92]',
                      isSelected && 'bg-emerald-50/60 hover:bg-emerald-50/80',
                      isDocOpen && 'bg-slate-50',
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
                      {aluguel.isento
                        ? <Badge className="bg-violet-100 text-violet-700 hover:bg-violet-100 text-xs font-semibold whitespace-nowrap">Isento</Badge>
                        : <Badge className={cn('text-xs font-semibold whitespace-nowrap', st.badgeCls)}>{st.label}</Badge>
                      }
                    </div>

                    {/* Cobrança */}
                    <div className="mb-2 md:mb-0">
                      <CobrancaButton
                        aluguel={aluguel}
                        onClick={() => handleAbrirCobranca(aluguel)}
                        onReenviar={() => handleReenviarEmail(aluguel)}
                        loadingReenviar={loadingReenviarId === aluguel.id}
                      />
                    </div>

                    {/* Valor */}
                    <div className="mb-2 md:mb-0">
                      {aluguel.desconto && aluguel.desconto > 0 ? (
                        <span
                          title={`Desconto de ${formatarMoeda(aluguel.desconto)} concedido`}
                          className="flex flex-col leading-tight"
                        >
                          <span className="text-[11px] text-slate-400 line-through">{formatarMoeda(aluguel.valor)}</span>
                          <span className="text-sm font-bold text-emerald-700">
                            {formatarMoeda(aluguel.valor - aluguel.desconto)}
                          </span>
                        </span>
                      ) : (
                        <span className={cn(
                          'text-sm font-bold',
                          isPago ? 'text-emerald-600'
                            : aluguel.status === 'atrasado' ? 'text-red-600'
                            : isFinalizado ? 'text-slate-400 line-through'
                            : 'text-slate-700',
                        )}>
                          {formatarMoeda(aluguel.valor)}
                        </span>
                      )}
                    </div>

                    {/* Ações dropdown */}
                    <div className="flex items-center gap-1">
                      {/* Botão rápido visível */}
                      {(aluguel.status === 'pendente' || aluguel.status === 'atrasado') && (
                        <button
                          onClick={() => handlePagar(aluguel)}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md px-2 py-1 transition-colors whitespace-nowrap"
                        >
                          Registrar
                        </button>
                      )}
                      {isPago && (
                        <button
                          onClick={() => handleGerarRecibo(aluguel)}
                          disabled={loadingRecibo === aluguel.id}
                          title={aluguel.recibo_gerado ? 'Ver recibo' : 'Gerar recibo'}
                          className="flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-40"
                        >
                          {loadingRecibo === aluguel.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Receipt className="h-3.5 w-3.5" />}
                        </button>
                      )}
                      <DropdownMenu
                        onOpenChange={open => {
                          if (open && isPrimeiro) {
                            localStorage.setItem('alugueis_menu_visto', '1')
                            setMenuVisto(true)
                          }
                        }}
                      >
                        <div className="relative">
                          {/* Anel pulsante — apenas no primeiro item quando menu nunca foi aberto */}
                          {isPrimeiro && (
                            <span className="absolute inset-0 rounded-md bg-emerald-400/25 animate-ping pointer-events-none" />
                          )}
                          <DropdownMenuTrigger
                            className={cn(
                              'inline-flex items-center justify-center h-7 w-7 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-opacity',
                              isPrimeiro ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                            )}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                        </div>
                        <DropdownMenuContent align="end" className="w-56">

                          {/* ── ATRASADO ── */}
                          {aluguel.status === 'atrasado' && <>
                            <DropdownMenuItem onClick={() => handlePagar(aluguel)}>
                              <Banknote className="h-3.5 w-3.5 mr-2" />
                              Registrar pagamento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModal({ type: 'pagamento-parcial', aluguel })}>
                              <SplitSquareHorizontal className="h-3.5 w-3.5 mr-2" />
                              Registrar pagamento parcial
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => abrirModal({ type: 'lembrete', aluguel })}>
                              <Mail className="h-3.5 w-3.5 mr-2" />
                              Enviar lembrete por e-mail
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => abrirModal({ type: 'cancelar', aluguel })}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Ban className="h-3.5 w-3.5 mr-2" />
                              Cancelar cobrança
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>}

                          {/* ── PENDENTE ── */}
                          {aluguel.status === 'pendente' && <>
                            {aluguel.imovel?.billing_mode === 'AUTOMATIC' ? (
                              !aluguel.asaas_charge_id ? (
                                <DropdownMenuItem
                                  disabled={loadingCobranca === aluguel.id}
                                  onClick={() => handleGerarCobranca(aluguel)}
                                >
                                  {loadingCobranca === aluguel.id
                                    ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                    : <Zap className="h-3.5 w-3.5 mr-2 text-amber-500" />}
                                  Gerar cobrança PIX/Boleto
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleAbrirCobranca(aluguel)}>
                                  <Zap className="h-3.5 w-3.5 mr-2 text-emerald-500" />
                                  Ver cobrança PIX/Boleto
                                </DropdownMenuItem>
                              )
                            ) : null}
                            <DropdownMenuItem onClick={() => handlePagar(aluguel)}>
                              <Banknote className="h-3.5 w-3.5 mr-2" />
                              Registrar pagamento
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePagar(aluguel)}>
                              <CheckCircle2 className="h-3.5 w-3.5 mr-2" />
                              Marcar como pago
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => abrirModal({ type: 'desconto', aluguel })}>
                              <Tag className="h-3.5 w-3.5 mr-2" />
                              Conceder desconto
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModal({ type: 'isentar', aluguel })}>
                              <Gift className="h-3.5 w-3.5 mr-2" />
                              Isentar este mês
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => abrirModal({ type: 'cancelar', aluguel })}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Ban className="h-3.5 w-3.5 mr-2" />
                              Cancelar cobrança
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>}

                          {/* ── PAGO ── */}
                          {isPago && <>
                            <DropdownMenuItem
                              disabled={loadingRecibo === aluguel.id}
                              onClick={() => handleGerarRecibo(aluguel)}
                            >
                              {loadingRecibo === aluguel.id
                                ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                                : <Receipt className="h-3.5 w-3.5 mr-2" />}
                              {aluguel.recibo_gerado ? 'Ver recibo' : 'Gerar recibo'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => abrirModal({ type: 'reenviar-recibo', aluguel })}>
                              <Mail className="h-3.5 w-3.5 mr-2" />
                              Reenviar recibo por e-mail
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                          </>}

                          {/* ── CANCELADO / ESTORNADO ── */}
                          {isFinalizado && <>
                            <DropdownMenuItem disabled>
                              <AlertCircle className="h-3.5 w-3.5 mr-2 text-slate-400" />
                              {aluguel.status === 'cancelado' ? 'Cobrança cancelada' : 'Cobrança estornada'}
                            </DropdownMenuItem>
                            {aluguel.motivo_cancelamento && (
                              <DropdownMenuItem disabled className="text-xs text-slate-400 whitespace-normal">
                                {aluguel.motivo_cancelamento}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                          </>}

                          {/* ── DOCUMENTOS (sempre) ── */}
                          <DropdownMenuItem onClick={toggleDocumentos}>
                            <Paperclip className="h-3.5 w-3.5 mr-2" />
                            {isDocOpen ? 'Fechar documentos' : 'Documentos do período'}
                          </DropdownMenuItem>

                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Accordion de documentos */}
                  {isDocOpen && (
                    <div className="px-5 pb-5 pt-1 bg-slate-50/70 border-t border-slate-100">
                      <DocumentosAluguel aluguelId={aluguel.id} />
                    </div>
                  )}
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

      </>}

      {/* ── Modais de ação ── */}
      <PagarModal open={modalOpen} onOpenChange={setModalOpen} aluguel={pagando} />

      <PagamentoParcialModal
        open={actionModal?.type === 'pagamento-parcial'}
        aluguel={actionModal?.type === 'pagamento-parcial' ? actionModal.aluguel : null}
        onClose={fecharModal}
        onSuccess={u => atualizarAluguel(actionModal?.type === 'pagamento-parcial' ? actionModal.aluguel.id : '', u)}
      />
      <LembreteModal
        open={actionModal?.type === 'lembrete'}
        aluguel={actionModal?.type === 'lembrete' ? actionModal.aluguel : null}
        onClose={fecharModal}
        onSuccess={u => atualizarAluguel(actionModal?.type === 'lembrete' ? actionModal.aluguel.id : '', u)}
      />
      <CancelarCobrancaModal
        open={actionModal?.type === 'cancelar'}
        aluguel={actionModal?.type === 'cancelar' ? actionModal.aluguel : null}
        onClose={fecharModal}
        onSuccess={id => atualizarAluguel(id, { status: 'cancelado' })}
      />
      <DescontoModal
        open={actionModal?.type === 'desconto'}
        aluguel={actionModal?.type === 'desconto' ? actionModal.aluguel : null}
        onClose={fecharModal}
        onSuccess={u => atualizarAluguel(actionModal?.type === 'desconto' ? actionModal.aluguel.id : '', u)}
      />
      <IsentarModal
        open={actionModal?.type === 'isentar'}
        aluguel={actionModal?.type === 'isentar' ? actionModal.aluguel : null}
        onClose={fecharModal}
        onSuccess={u => atualizarAluguel(actionModal?.type === 'isentar' ? actionModal.aluguel.id : '', u)}
      />
      <ReenviarReciboModal
        open={actionModal?.type === 'reenviar-recibo'}
        aluguel={actionModal?.type === 'reenviar-recibo' ? actionModal.aluguel : null}
        onClose={fecharModal}
        onSuccess={u => atualizarAluguel(actionModal?.type === 'reenviar-recibo' ? actionModal.aluguel.id : '', u)}
      />

      {cobrancaAluguel && (
        <CobrancaModal
          aluguel={cobrancaAluguel}
          pixKey={profile.pix_key ?? null}
          pixKeyTipo={profile.pix_key_tipo ?? null}
          nomeProprietario={profile.nome}
          open={cobrancaOpen}
          onClose={() => setCobrancaOpen(false)}
          loadingCobranca={loadingCobranca === cobrancaAluguel.id}
          loadingEmail={loadingEmail}
          onGerarCobranca={() => {
            setCobrancaOpen(false)
            handleGerarCobranca(cobrancaAluguel)
          }}
          onCancelarCobranca={() => {
            setCobrancaOpen(false)
            handleCancelarCobranca(cobrancaAluguel)
          }}
          onRegistrarPagamento={() => {
            setCobrancaOpen(false)
            handlePagar(cobrancaAluguel)
          }}
          onEnviarEmail={() => handleEnviarEmail(cobrancaAluguel)}
        />
      )}

      {/* ── Modal Cobrar Todos ── */}
      {cobraTodosOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
          onClick={() => { if (cobraProgresso.status !== 'running') setCobraTodosOpen(false) }}
        >
          <div
            className="bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <p className="font-semibold text-slate-900">Cobrar todos</p>
              {cobraProgresso.status !== 'running' && (
                <button
                  onClick={() => setCobraTodosOpen(false)}
                  className="flex items-center justify-center h-7 w-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="px-5 pb-5 pt-4 space-y-4">

              {/* Confirmação */}
              {cobraProgresso.status === 'idle' && (
                <>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Você tem{' '}
                    <strong>{semCobranca.length}</strong>{' '}
                    aluguel{semCobranca.length !== 1 ? 'is' : ''} pendente{semCobranca.length !== 1 ? 's' : ''} sem cobrança enviada.
                    {semCobranca.length > semCobrancaComEmail.length && (
                      <span className="text-slate-400">
                        {' '}({semCobranca.length - semCobrancaComEmail.length} sem e-mail cadastrado)
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-slate-600">
                    Deseja enviar o Pix por e-mail para{' '}
                    <strong>
                      {semCobrancaComEmail.length} inquilino{semCobrancaComEmail.length !== 1 ? 's' : ''}
                    </strong>{' '}
                    com e-mail cadastrado?
                  </p>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
                    onClick={handleCobrarTodos}
                    disabled={semCobrancaComEmail.length === 0}
                  >
                    <Mail className="h-4 w-4" />
                    Enviar para {semCobrancaComEmail.length} inquilino{semCobrancaComEmail.length !== 1 ? 's' : ''}
                  </Button>
                  {semCobrancaComEmail.length === 0 && (
                    <p className="text-xs text-slate-400 text-center">
                      Nenhum inquilino com e-mail cadastrado. Cadastre os e-mails em Imóveis para usar esta função.
                    </p>
                  )}
                </>
              )}

              {/* Progresso */}
              {cobraProgresso.status === 'running' && (
                <div className="flex flex-col items-center gap-3 py-4">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
                  <p className="text-sm text-slate-700 text-center">
                    Enviando {Math.min(cobraProgresso.feitos + cobraProgresso.erros + 1, cobraProgresso.total)} de {cobraProgresso.total}...
                  </p>
                  <p className="text-xs text-slate-400">{cobraProgresso.feitos} enviado{cobraProgresso.feitos !== 1 ? 's' : ''} até agora</p>
                </div>
              )}

              {/* Resultado */}
              {cobraProgresso.status === 'done' && (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1.5">
                    <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      {cobraProgresso.feitos} e-mail{cobraProgresso.feitos !== 1 ? 's' : ''} enviado{cobraProgresso.feitos !== 1 ? 's' : ''}
                    </p>
                    {cobraProgresso.erros > 0 && (
                      <p className="text-xs text-amber-700">
                        {cobraProgresso.erros} não enviado{cobraProgresso.erros !== 1 ? 's' : ''} — verifique os e-mails
                      </p>
                    )}
                    {semCobranca.length > semCobrancaComEmail.length && (
                      <p className="text-xs text-slate-500">
                        {semCobranca.length - semCobrancaComEmail.length} sem e-mail — não foram notificados
                      </p>
                    )}
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setCobraTodosOpen(false)}>
                    Fechar
                  </Button>
                </>
              )}

            </div>
          </div>
        </div>
      )}
    </>
  )
}
