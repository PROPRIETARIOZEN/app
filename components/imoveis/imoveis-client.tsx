'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, Building2, Home, Square, Briefcase, MapPin,
  Zap, Loader2, MoreHorizontal, LayoutGrid, List,
  CheckCircle2, Clock, AlertTriangle, Pencil, Archive,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ImovelModal } from '@/components/imoveis/imovel-modal'
import { arquivarImovel } from '@/app/(dashboard)/imoveis/actions'
import { formatarMoeda, formatarData } from '@/lib/helpers'
import { LIMITES_PLANO } from '@/lib/stripe'
import type { Imovel } from '@/types'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

// ─── Constantes ───────────────────────────────────────────────────────────────

const labelsTipo: Record<string, string> = {
  apartamento: 'Apartamento', casa: 'Casa', kitnet: 'Kitnet',
  comercial: 'Comercial', terreno: 'Terreno', outro: 'Outro',
}

const tipoIcone: Record<string, LucideIcon> = {
  apartamento: Building2, casa: Home, kitnet: Square,
  comercial: Briefcase, terreno: MapPin, outro: Building2,
}

type AluguelMes = {
  imovel_id: string
  status: string
  data_pagamento: string | null
  data_vencimento: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function diasAte(dataStr: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataStr + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function StatusAluguelLine({ aluguel }: { aluguel: AluguelMes | undefined }) {
  if (!aluguel) {
    return <span className="text-xs text-[#94A3B8] italic">Imóvel vago</span>
  }
  if (aluguel.status === 'pago') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        Pago em {aluguel.data_pagamento ? formatarData(aluguel.data_pagamento) : '—'}
      </span>
    )
  }
  if (aluguel.status === 'atrasado') {
    const dias = Math.abs(diasAte(aluguel.data_vencimento))
    return (
      <span className="flex items-center gap-1 text-xs text-red-600 font-medium">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {dias} dia{dias !== 1 ? 's' : ''} em atraso
      </span>
    )
  }
  // pendente
  const dias = diasAte(aluguel.data_vencimento)
  return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      Vence em {dias > 0 ? `${dias} dia${dias !== 1 ? 's' : ''}` : 'hoje'}
    </span>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  imoveis: Imovel[]
  plano: 'gratis' | 'pago'
  alugueisMes: AluguelMes[]
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function ImoveisClient({ imoveis, plano, alugueisMes }: Props) {
  const router = useRouter()
  const [open, setOpen]               = useState(false)
  const [editando, setEditando]       = useState<Imovel | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [loadingCheckout, setLoadingCheckout] = useState(false)
  const [view, setView]               = useState<'grid' | 'list'>('grid')

  // Persistir preferência de view
  useEffect(() => {
    const saved = localStorage.getItem('imoveis_view')
    if (saved === 'list' || saved === 'grid') setView(saved)
  }, [])
  function toggleView(v: 'grid' | 'list') {
    setView(v); localStorage.setItem('imoveis_view', v)
  }

  const limite       = LIMITES_PLANO[plano].maxImoveis
  const atingiuLimite = imoveis.length >= limite

  // Mapa rápido imovel_id → aluguel do mês
  const aluguelMap = Object.fromEntries(alugueisMes.map(a => [a.imovel_id, a]))

  function handleNovo() {
    if (atingiuLimite) { setUpgradeOpen(true); return }
    setEditando(null); setOpen(true)
  }
  function handleEditar(imovel: Imovel) { setEditando(imovel); setOpen(true) }

  async function handleArquivar(imovel: Imovel) {
    if (!confirm(`Arquivar "${imovel.apelido}"?`)) return
    const result = await arquivarImovel(imovel.id)
    if (result.error) toast.error(result.error)
    else toast.success('Imóvel arquivado')
  }

  async function handleAssinar() {
    setLoadingCheckout(true)
    try {
      const res = await fetch('/api/checkout', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao iniciar pagamento'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor de pagamento') }
    finally { setLoadingCheckout(false) }
  }

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Imóveis</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {imoveis.length} de {limite} imóve{imoveis.length !== 1 ? 'is' : 'l'} · plano {plano === 'pago' ? 'Pro' : 'Grátis'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Toggle grid / lista */}
          <div className="flex items-center rounded-lg border border-[#E2E8F0] bg-white p-0.5">
            <button
              onClick={() => toggleView('grid')}
              className={cn(
                'flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                view === 'grid' ? 'bg-[#0F172A] text-white' : 'text-[#94A3B8] hover:text-[#475569]',
              )}
              title="Grade"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => toggleView('list')}
              className={cn(
                'flex items-center justify-center h-7 w-7 rounded-md transition-colors',
                view === 'list' ? 'bg-[#0F172A] text-white' : 'text-[#94A3B8] hover:text-[#475569]',
              )}
              title="Lista"
            >
              <List className="h-3.5 w-3.5" />
            </button>
          </div>
          <Button onClick={handleNovo} className="gap-2 bg-[#059669] hover:bg-[#047857]">
            <Plus className="h-4 w-4" />
            Novo imóvel
          </Button>
        </div>
      </div>

      {/* ── Banner plano Grátis ───────────────────────────────────────────── */}
      {plano === 'gratis' && imoveis.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-700">
            Plano Grátis: {imoveis.length}/{limite} imóvel usado. Faça upgrade para cadastrar até 5.
          </p>
          <Button size="sm" className="shrink-0 bg-amber-500 hover:bg-amber-600 gap-1.5 text-white" onClick={() => router.push('/planos')}>
            <Zap className="h-3.5 w-3.5" />Fazer upgrade
          </Button>
        </div>
      )}

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {imoveis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Building2 className="h-7 w-7 text-slate-300" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#0F172A]">Nenhum imóvel cadastrado ainda</p>
            <p className="text-sm text-[#64748B] mt-1 max-w-xs">
              Comece adicionando seu primeiro imóvel para gerenciar aluguéis e inquilinos.
            </p>
          </div>
          <Button onClick={handleNovo} className="gap-2 bg-[#059669] hover:bg-[#047857] mt-1">
            <Plus className="h-4 w-4" />
            Adicionar primeiro imóvel
          </Button>
        </div>

      ) : view === 'grid' ? (
        /* ── Grid de cards ─────────────────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {imoveis.map(imovel => {
            const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
            const ocupado        = !!inquilinoAtivo
            const TipoIcon       = tipoIcone[imovel.tipo] ?? Building2
            const aluguel        = aluguelMap[imovel.id]

            return (
              <div key={imovel.id} className="bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] overflow-hidden flex flex-col">

                {/* Header colorido */}
                <div className="relative bg-[#D1FAE5] px-5 py-6 flex items-center justify-center">
                  <TipoIcon className="h-10 w-10 text-[#059669]" />

                  {/* Dropdown 3 pontos — canto superior esquerdo */}
                  <div className="absolute top-2 left-2" onClick={e => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-emerald-200/60 transition-colors text-[#059669]">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-44">
                        <DropdownMenuItem onClick={() => handleEditar(imovel)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/alugueis')}>
                          <Building2 className="h-3.5 w-3.5 mr-2" />Ver aluguéis
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleArquivar(imovel)}
                          className="text-[#94A3B8] focus:text-[#475569]"
                        >
                          <Archive className="h-3.5 w-3.5 mr-2" />Arquivar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Badge status — canto superior direito */}
                  <div className="absolute top-2 right-2">
                    <Badge className={cn(
                      'text-[10px] font-semibold',
                      ocupado
                        ? 'bg-[#059669] text-white hover:bg-[#059669]'
                        : 'bg-white text-[#475569] hover:bg-white border border-[#E2E8F0]',
                    )}>
                      {ocupado ? 'Ocupado' : 'Vago'}
                    </Badge>
                  </div>
                </div>

                {/* Body */}
                <div className="px-5 pt-4 pb-3 flex-1">
                  <p className="font-bold text-[15px] text-[#0F172A] truncate leading-tight">{imovel.apelido}</p>
                  <p className="text-xs text-[#94A3B8] truncate mt-0.5 mb-3">{imovel.endereco}</p>

                  {/* Grade 2×2 de info */}
                  <div className="grid grid-cols-2 border border-[#F1F5F9] rounded-lg overflow-hidden">
                    {[
                      { label: 'ALUGUEL',    value: formatarMoeda(imovel.valor_aluguel) },
                      { label: 'VENCIMENTO', value: `Dia ${imovel.dia_vencimento}` },
                      { label: 'INQUILINO',  value: inquilinoAtivo?.nome ?? '—' },
                      { label: 'TIPO',       value: labelsTipo[imovel.tipo] ?? imovel.tipo },
                    ].map(({ label, value }, idx) => (
                      <div
                        key={label}
                        className={cn(
                          'px-3 py-2.5',
                          idx % 2 === 0 ? 'border-r border-[#F1F5F9]' : '',
                          idx < 2 ? 'border-b border-[#F1F5F9]' : '',
                        )}
                      >
                        <p className="text-[10px] uppercase tracking-[0.06em] text-[#94A3B8] font-medium">{label}</p>
                        <p className="text-[13px] font-medium text-[#334155] mt-0.5 truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer — linha de status do aluguel */}
                <div className="px-5 py-3 border-t border-[#F1F5F9]">
                  <StatusAluguelLine aluguel={inquilinoAtivo ? aluguel : undefined} />
                </div>
              </div>
            )
          })}
        </div>

      ) : (
        /* ── Modo lista ────────────────────────────────────────────────── */
        <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-[#E2E8F0]">
              <tr>
                {['Imóvel', 'Tipo', 'Inquilino', 'Aluguel', 'Vencimento', 'Status', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9]">
              {imoveis.map(imovel => {
                const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
                const TipoIcon       = tipoIcone[imovel.tipo] ?? Building2
                const aluguel        = aluguelMap[imovel.id]

                return (
                  <tr key={imovel.id} className="hover:bg-slate-50 transition-colors" style={{ height: 52 }}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-[#D1FAE5] flex items-center justify-center shrink-0">
                          <TipoIcon className="h-4 w-4 text-[#059669]" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-[#0F172A] truncate text-[13px]">{imovel.apelido}</p>
                          <p className="text-xs text-[#94A3B8] truncate max-w-40">{imovel.endereco}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-xs text-[#64748B] whitespace-nowrap">
                      {labelsTipo[imovel.tipo] ?? imovel.tipo}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#475569]">
                      {inquilinoAtivo?.nome ?? <span className="text-[#94A3B8] italic">Vago</span>}
                    </td>
                    <td className="px-4 py-2 text-[13px] font-medium text-[#0F172A] whitespace-nowrap">
                      {formatarMoeda(imovel.valor_aluguel)}
                    </td>
                    <td className="px-4 py-2 text-xs text-[#64748B] whitespace-nowrap">
                      Dia {imovel.dia_vencimento}
                    </td>
                    <td className="px-4 py-2">
                      <StatusAluguelLine aluguel={inquilinoAtivo ? aluguel : undefined} />
                    </td>
                    <td className="px-4 py-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 transition-colors text-[#64748B]">
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => handleEditar(imovel)}>
                            <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push('/alugueis')}>
                            <Building2 className="h-3.5 w-3.5 mr-2" />Ver aluguéis
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleArquivar(imovel)}
                            className="text-[#94A3B8] focus:text-[#475569]"
                          >
                            <Archive className="h-3.5 w-3.5 mr-2" />Arquivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modais ───────────────────────────────────────────────────────── */}
      <ImovelModal open={open} onOpenChange={setOpen} imovel={editando} />

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-emerald-500" />
              Limite do plano Grátis
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-1">
            <p className="text-sm text-[#475569]">
              O plano Grátis permite apenas <strong>1 imóvel</strong>. Faça upgrade para o{' '}
              <strong className="text-emerald-600">Pro</strong> e cadastre até{' '}
              <strong>5 imóveis</strong>, além de recibos PDF, reajuste automático e muito mais.
            </p>
            <div className="rounded-xl border border-emerald-200 bg-[#D1FAE5]/40 p-4 space-y-2">
              <p className="text-sm font-semibold text-emerald-700">ProprietárioZen Pro</p>
              <p className="text-2xl font-bold text-emerald-700">
                R$ 29,90<span className="text-sm font-normal text-[#94A3B8]">/mês</span>
              </p>
              <ul className="text-xs text-[#475569] space-y-1 pt-1">
                {['Até 5 imóveis', 'Recibos PDF ilimitados', 'Reajuste automático', 'Alertas por e-mail'].map(f => (
                  <li key={f} className="flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-emerald-500 shrink-0" />{f}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setUpgradeOpen(false)}>Agora não</Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-2"
                disabled={loadingCheckout}
                onClick={handleAssinar}
              >
                {loadingCheckout ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                Assinar Pro
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
