'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Users, Pencil, UserX, Phone, Building2,
  Search, MoreHorizontal, CheckCircle2, Clock, AlertTriangle, Paperclip,
  Mail, ShieldOff,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { InquilinoModal } from '@/components/inquilinos/inquilino-modal'
import { DocumentosInquilino } from '@/components/documentos/DocumentosInquilino'
import { desativarInquilino } from '@/app/(dashboard)/inquilinos/actions'
import { formatarTelefone, formatarMoeda, formatarData } from '@/lib/helpers'
import type { Inquilino } from '@/types'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ImovelOpcao = { id: string; apelido: string }

type InquilinoRich = Inquilino & {
  imovel?: { id: string; apelido: string; valor_aluguel?: number } | null
}

type AluguelMes = {
  inquilino_id: string
  status: string
  data_pagamento: string | null
  data_vencimento: string
}

// ─── Helpers de avatar ────────────────────────────────────────────────────────

const CORES_AVATAR = [
  'bg-emerald-100 text-emerald-700',
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-teal-100 text-teal-700',
]

function corAvatar(nome: string): string {
  let hash = 0
  for (let i = 0; i < nome.length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash)
  return CORES_AVATAR[Math.abs(hash) % CORES_AVATAR.length]
}

function iniciaisNome(nome: string): string {
  return nome.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
}

// ─── Status line do aluguel ───────────────────────────────────────────────────

function diasAte(dataStr: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataStr + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function StatusAluguelLine({ aluguel }: { aluguel: AluguelMes | undefined }) {
  if (!aluguel) {
    return <span className="text-xs text-[#94A3B8]">Sem registro este mês</span>
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
  const dias = diasAte(aluguel.data_vencimento)
  return (
    <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      Vence em {dias > 0 ? `${dias} dia${dias !== 1 ? 's' : ''}` : 'hoje'}
    </span>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  inquilinos: InquilinoRich[]
  imoveis: ImovelOpcao[]
  alugueisMes: AluguelMes[]
}

export function InquilinosClient({ inquilinos, imoveis, alugueisMes }: Props) {
  const router = useRouter()
  const [open, setOpen]         = useState(false)
  const [editando, setEditando] = useState<Inquilino | null>(null)
  const [busca, setBusca]       = useState('')
  const [docInquilino, setDocInquilino] = useState<{ id: string; nome: string } | null>(null)
  const [convidando, setConvidando] = useState<string | null>(null)
  const [revogando, setRevogando]   = useState<string | null>(null)

  const aluguelMap = Object.fromEntries(
    alugueisMes.map(a => [a.inquilino_id, a])
  )

  const ativos   = inquilinos.filter(i => i.ativo)
  const inativos = inquilinos.filter(i => !i.ativo)

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return inquilinos
    return inquilinos.filter(i =>
      i.nome.toLowerCase().includes(q) ||
      (i.email ?? '').toLowerCase().includes(q)
    )
  }, [inquilinos, busca])

  function handleNovo()           { setEditando(null); setOpen(true) }
  function handleEditar(i: Inquilino) { setEditando(i); setOpen(true) }

  async function handleDesativar(inquilino: Inquilino) {
    if (!confirm(`Desativar "${inquilino.nome}"?`)) return
    const result = await desativarInquilino(inquilino.id)
    if (result.error) toast.error(result.error)
    else toast.success('Inquilino desativado')
  }

  async function handleEnviarConvite(inquilino: InquilinoRich) {
    if (!inquilino.email) {
      toast.error('Inquilino não possui e-mail cadastrado.')
      return
    }
    setConvidando(inquilino.id)
    try {
      const res = await fetch('/api/inquilino/enviar-convite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquilinoId: inquilino.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erro ao enviar convite.'); return }
      toast.success('Convite enviado!', {
        description: data.link,
        action: {
          label: 'Copiar link',
          onClick: () => navigator.clipboard.writeText(data.link),
        },
      })
      router.refresh()
    } finally {
      setConvidando(null)
    }
  }

  async function handleRevogar(inquilino: InquilinoRich) {
    if (!confirm(`Revogar acesso de "${inquilino.nome}"? O link atual deixará de funcionar.`)) return
    setRevogando(inquilino.id)
    try {
      const res = await fetch('/api/inquilino/revogar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inquilinoId: inquilino.id }),
      })
      if (!res.ok) { toast.error('Erro ao revogar acesso.'); return }
      toast.success('Acesso revogado com sucesso.')
      router.refresh()
    } finally {
      setRevogando(null)
    }
  }

  return (
    <>
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Inquilinos</h1>
          <p className="text-sm text-[#475569] mt-0.5">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            {inativos.length > 0 && ` · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Busca inline */}
          {inquilinos.length > 0 && (
            <div className="relative w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#94A3B8]" />
              <Input
                placeholder="Buscar por nome ou email"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="pl-9 h-9 text-sm w-full"
              />
            </div>
          )}
          <Button onClick={handleNovo} className="gap-2 bg-[#059669] hover:bg-[#047857] shrink-0">
            <Plus className="h-4 w-4" />
            Novo inquilino
          </Button>
        </div>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {inquilinos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Users className="h-7 w-7 text-slate-300" />
          </div>
          <div>
            <p className="text-base font-semibold text-[#0F172A]">Nenhum inquilino cadastrado ainda</p>
            <p className="text-sm text-[#64748B] mt-1 max-w-xs">
              Adicione inquilinos e vincule-os aos seus imóveis para controlar os pagamentos.
            </p>
          </div>
          <Button onClick={handleNovo} className="gap-2 bg-[#059669] hover:bg-[#047857] mt-1">
            <Plus className="h-4 w-4" />
            Adicionar primeiro inquilino
          </Button>
        </div>

      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
          <Search className="h-8 w-8 text-slate-200" />
          <p className="text-sm text-[#64748B]">Nenhum inquilino encontrado para &ldquo;{busca}&rdquo;</p>
          <button onClick={() => setBusca('')} className="text-xs text-emerald-600 hover:underline">
            Limpar busca
          </button>
        </div>

      ) : (
        /* ── Grid de cards ─────────────────────────────────────────────── */
        <div className="grid gap-4 sm:grid-cols-2">
          {filtrados.map(inquilino => {
            const aluguel  = aluguelMap[inquilino.id]
            const imovel   = inquilino.imovel
            const avatarCn = corAvatar(inquilino.nome)

            return (
              <div
                key={inquilino.id}
                className={cn(
                  'bg-white rounded-xl border border-[#E2E8F0] shadow-[0_1px_3px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden',
                  !inquilino.ativo && 'opacity-60',
                )}
              >
                {/* ── Topo: avatar + nome + badge ───────────────────── */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-4">
                  <div className={cn(
                    'h-12 w-12 rounded-full flex items-center justify-center text-base font-semibold shrink-0',
                    avatarCn,
                  )}>
                    {iniciaisNome(inquilino.nome)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-[15px] text-[#0F172A] truncate leading-tight">
                        {inquilino.nome}
                      </p>
                      <Badge className={cn(
                        'text-[10px] h-4 px-1.5 font-semibold shrink-0',
                        inquilino.ativo
                          ? 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5]'
                          : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#F1F5F9]',
                      )}>
                        {inquilino.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                      {inquilino.convite_enviado_em && (
                        <Badge className="text-[10px] h-4 px-1.5 font-semibold shrink-0 bg-teal-50 text-teal-700 hover:bg-teal-50 gap-0.5">
                          <Mail className="h-2.5 w-2.5" />
                          Convite
                        </Badge>
                      )}
                    </div>
                    {inquilino.email && (
                      <p className="text-xs text-[#94A3B8] truncate mt-0.5">{inquilino.email}</p>
                    )}
                  </div>
                </div>

                {/* ── Linha divisória ──────────────────────────────── */}
                <div className="h-px bg-[#F1F5F9] mx-5" />

                {/* ── Detalhes: telefone + imóvel ──────────────────── */}
                <div className="px-5 py-3 space-y-2">
                  {inquilino.telefone && (
                    <div className="flex items-center gap-2 text-xs text-[#475569]">
                      <Phone className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                      {formatarTelefone(inquilino.telefone)}
                    </div>
                  )}
                  {imovel && (
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
                      <button
                        onClick={() => router.push('/imoveis')}
                        className="text-[#059669] font-medium hover:underline truncate"
                      >
                        {imovel.apelido}
                      </button>
                      {imovel.valor_aluguel != null && (
                        <>
                          <span className="text-[#CBD5E1]">·</span>
                          <span className="text-[#64748B]">{formatarMoeda(imovel.valor_aluguel)}/mês</span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Linha divisória ──────────────────────────────── */}
                <div className="h-px bg-[#F1F5F9] mx-5" />

                {/* ── Rodapé: status + ações ───────────────────────── */}
                <div className="px-5 py-3 flex items-center justify-between gap-2">
                  <StatusAluguelLine aluguel={inquilino.ativo ? aluguel : undefined} />

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2.5 gap-1.5 text-xs text-[#475569] hover:text-[#0F172A]"
                      onClick={() => handleEditar(inquilino)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="h-8 w-8 flex items-center justify-center rounded hover:bg-slate-100 transition-colors text-[#64748B]">
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => handleEditar(inquilino)}>
                          <Pencil className="h-3.5 w-3.5 mr-2" />Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/alugueis')}>
                          <Building2 className="h-3.5 w-3.5 mr-2" />Ver aluguéis
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setDocInquilino({ id: inquilino.id, nome: inquilino.nome })}>
                          <Paperclip className="h-3.5 w-3.5 mr-2" />Documentos
                        </DropdownMenuItem>
                        {inquilino.ativo && inquilino.email && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleEnviarConvite(inquilino)}
                              disabled={convidando === inquilino.id}
                            >
                              <Mail className="h-3.5 w-3.5 mr-2" />
                              {convidando === inquilino.id
                                ? 'Enviando...'
                                : inquilino.convite_enviado_em
                                  ? 'Reenviar convite'
                                  : 'Enviar convite'}
                            </DropdownMenuItem>
                            {inquilino.convite_enviado_em && (
                              <DropdownMenuItem
                                onClick={() => handleRevogar(inquilino)}
                                disabled={revogando === inquilino.id}
                                className="text-red-600 focus:text-red-600"
                              >
                                <ShieldOff className="h-3.5 w-3.5 mr-2" />
                                {revogando === inquilino.id ? 'Revogando...' : 'Revogar acesso'}
                              </DropdownMenuItem>
                            )}
                          </>
                        )}
                        {inquilino.ativo && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDesativar(inquilino)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <UserX className="h-3.5 w-3.5 mr-2" />Desativar
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <InquilinoModal open={open} onOpenChange={setOpen} inquilino={editando} imoveis={imoveis} />

      {/* Sheet de documentos do inquilino */}
      <Sheet open={!!docInquilino} onOpenChange={(o) => { if (!o) setDocInquilino(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          <SheetHeader className="px-5 pt-5 pb-4 border-b border-[#F1F5F9]">
            <div className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-emerald-600 shrink-0" />
              <SheetTitle className="text-[15px] font-semibold text-[#0F172A]">
                Documentos de {docInquilino?.nome.split(' ')[0]}
              </SheetTitle>
            </div>
            <p className="text-xs text-[#94A3B8]">RG, CPF, CNH e comprovantes</p>
          </SheetHeader>
          {docInquilino && (
            <div className="flex-1 overflow-y-auto">
              <DocumentosInquilino
                inquilinoId={docInquilino.id}
                nomeInquilino={docInquilino.nome}
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
