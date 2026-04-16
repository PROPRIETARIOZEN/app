'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Check, X, Zap, FileText, TrendingUp,
  BarChart3, Mail, Shield, Loader2, Star, Building2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanoTipo } from '@/lib/stripe'

// ─── Feature row ─────────────────────────────────────────────────────────────

function Recurso({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm py-0.5">
      {ok
        ? <Check className="h-4 w-4 shrink-0 text-emerald-500 mt-0.5" />
        : <X className="h-4 w-4 shrink-0 text-[#CBD5E1] mt-0.5" />}
      <span className={ok ? 'text-[#334155]' : 'text-[#94A3B8]'}>{children}</span>
    </li>
  )
}

// ─── Plan card ───────────────────────────────────────────────────────────────

interface PlanCardProps {
  nome: string
  preco: string
  descricao: string
  recursos: { label: string; ok: boolean }[]
  ativo: boolean
  cor: 'slate' | 'emerald' | 'purple'
  badge?: string
  cta?: React.ReactNode
}

function PlanCard({ nome, preco, descricao, recursos, ativo, cor, badge, cta }: PlanCardProps) {
  const borderClass = {
    slate:   ativo ? 'border-2 border-[#CBD5E1] ring-2 ring-[#E2E8F0]' : 'border border-[#E2E8F0]',
    emerald: ativo ? 'border-2 border-emerald-500 ring-2 ring-emerald-100' : 'border-2 border-emerald-500',
    purple:  ativo ? 'border-2 border-purple-500 ring-2 ring-purple-100' : 'border-2 border-purple-500',
  }[cor]

  const headerClass = {
    slate:   'text-[#475569]',
    emerald: 'text-emerald-600',
    purple:  'text-purple-600',
  }[cor]

  const priceClass = {
    slate:   'text-[#0F172A]',
    emerald: 'text-emerald-700',
    purple:  'text-purple-700',
  }[cor]

  return (
    <div className={cn(
      'relative flex flex-col rounded-2xl bg-white p-6',
      borderClass,
    )}>
      {/* Badge flutuante */}
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className={cn(
            'text-[11px] font-bold px-3 py-1 rounded-full text-white whitespace-nowrap',
            cor === 'emerald' ? 'bg-emerald-600' : 'bg-purple-600',
          )}>
            {badge}
          </span>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className={cn('text-[11px] font-bold uppercase tracking-widest', headerClass)}>{nome}</p>
          {ativo && (
            <Badge className={cn(
              'text-[10px] font-semibold px-2 py-0.5',
              cor === 'emerald'
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100'
                : cor === 'purple'
                  ? 'bg-purple-100 text-purple-700 hover:bg-purple-100'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-100',
            )}>
              <Check className="h-2.5 w-2.5 mr-1" />Plano atual
            </Badge>
          )}
        </div>
        <div className="flex items-baseline gap-0.5 mb-1">
          <span className={cn('text-[38px] font-bold leading-none', priceClass)}>{preco}</span>
          {preco !== 'R$ 0' && <span className="text-sm text-[#94A3B8] ml-1">/mês</span>}
        </div>
        <p className="text-xs text-[#64748B] mt-1">{descricao}</p>
      </div>

      {/* Recursos */}
      <ul className="space-y-0.5 flex-1 mb-6">
        {recursos.map(r => <Recurso key={r.label} ok={r.ok}>{r.label}</Recurso>)}
      </ul>

      {/* CTA */}
      {cta}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props { planoAtual: PlanoTipo }

export function PlanosClient({ planoAtual }: Props) {
  const [loadingMaster, setLoadingMaster] = useState(false)
  const [loadingElite,  setLoadingElite]  = useState(false)
  const [loadingPortal, setLoadingPortal] = useState(false)

  async function handleAssinar(plano: 'pago' | 'elite') {
    const setLoading = plano === 'elite' ? setLoadingElite : setLoadingMaster
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao iniciar pagamento'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor de pagamento') }
    finally { setLoading(false) }
  }

  async function handlePortal() {
    setLoadingPortal(true)
    try {
      const res = await fetch('/api/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) { toast.error(json.error ?? 'Erro ao abrir portal'); return }
      window.location.href = json.url
    } catch { toast.error('Erro ao conectar com o servidor') }
    finally { setLoadingPortal(false) }
  }

  // ── CTAs por combinação de plano ──────────────────────────────────────────

  const ctaGratis = planoAtual === 'gratis'
    ? <Button variant="outline" className="w-full cursor-default" disabled>Plano atual</Button>
    : null

  const ctaMaster = planoAtual === 'gratis'
    ? (
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
        onClick={() => handleAssinar('pago')}
        disabled={loadingMaster}
      >
        {loadingMaster ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        Assinar Master — R$ 49,90/mês
      </Button>
    ) : planoAtual === 'pago'
      ? (
        <Button
          variant="outline"
          className="w-full border-emerald-200 text-emerald-700 gap-2"
          onClick={handlePortal}
          disabled={loadingPortal}
        >
          {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
          Gerenciar assinatura
        </Button>
      )
      : (
        // elite → Master é inferior
        <Button variant="outline" className="w-full text-[#94A3B8]" disabled>Plano inferior</Button>
      )

  const ctaElite = planoAtual === 'elite'
    ? (
      <Button
        className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
        onClick={handlePortal}
        disabled={loadingPortal}
      >
        {loadingPortal ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Gerenciar assinatura
      </Button>
    ) : (
      <Button
        className="w-full bg-purple-600 hover:bg-purple-700 gap-2"
        onClick={() => handleAssinar('elite')}
        disabled={loadingElite}
      >
        {loadingElite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Star className="h-4 w-4" />}
        {planoAtual === 'pago' ? 'Fazer upgrade para Elite' : 'Assinar Elite — R$ 99,90/mês'}
      </Button>
    )

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Cabeçalho da página — estilo dashboard */}
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Planos</h1>
        <p className="text-sm text-[#475569] mt-0.5">
          Escolha o plano ideal para você. Cancele quando quiser.
        </p>
      </div>

      {/* Cards */}
      <div className="grid gap-5 sm:grid-cols-3">

        <PlanCard
          nome="Grátis"
          preco="R$ 0"
          descricao="Para sempre grátis"
          ativo={planoAtual === 'gratis'}
          cor="slate"
          recursos={[
            { label: '1 imóvel · 1 inquilino',          ok: true  },
            { label: '100 MB de armazenamento',           ok: true  },
            { label: 'Histórico de aluguéis',             ok: true  },
            { label: 'Dashboard com resumo',              ok: true  },
            { label: 'Recibos PDF',                       ok: false },
            { label: 'Reajuste automático',               ok: false },
            { label: 'Relatórios mensais',                ok: false },
            { label: 'Alertas por e-mail',                ok: false },
          ]}
          cta={ctaGratis ?? (
            <Button variant="outline" className="w-full text-[#94A3B8]" disabled>
              Plano inferior
            </Button>
          )}
        />

        <PlanCard
          nome="Master"
          preco="R$ 49,90"
          descricao="Menos de R$ 2 por dia"
          ativo={planoAtual === 'pago'}
          cor="emerald"
          badge={planoAtual === 'gratis' ? 'Mais popular' : undefined}
          recursos={[
            { label: '3 imóveis · 3 inquilinos',          ok: true  },
            { label: '500 MB de armazenamento',            ok: true  },
            { label: 'Histórico de aluguéis',              ok: true  },
            { label: 'Dashboard com resumo',               ok: true  },
            { label: 'Recibos PDF',                        ok: true  },
            { label: 'Reajuste automático (IGPM/IPCA)',    ok: true  },
            { label: 'Relatórios mensais',                 ok: true  },
            { label: 'Alertas por e-mail',                 ok: true  },
          ]}
          cta={ctaMaster}
        />

        <PlanCard
          nome="Elite"
          preco="R$ 99,90"
          descricao="Para gestão em escala"
          ativo={planoAtual === 'elite'}
          cor="purple"
          badge={planoAtual === 'pago' ? 'Recomendado' : undefined}
          recursos={[
            { label: '10 imóveis · ilimitado inquilinos',  ok: true  },
            { label: '5 GB de armazenamento',              ok: true  },
            { label: 'Histórico de aluguéis',              ok: true  },
            { label: 'Dashboard com resumo',               ok: true  },
            { label: 'Recibos PDF',                        ok: true  },
            { label: 'Reajuste automático (IGPM/IPCA)',    ok: true  },
            { label: 'Relatórios mensais',                 ok: true  },
            { label: 'Alertas + cobrança automática',      ok: true  },
            { label: 'Suporte prioritário',                ok: true  },
          ]}
          cta={ctaElite}
        />
      </div>

      {/* Garantias */}
      <div className="grid sm:grid-cols-3 gap-4 pt-2">
        {[
          { icon: Shield,   title: 'Cancele quando quiser',  sub: 'Sem fidelidade ou multa.' },
          { icon: Check,    title: 'Pagamento seguro SSL',   sub: 'Processado pela Stripe.' },
          { icon: Zap,      title: 'Ativação imediata',      sub: 'Acesso liberado na hora.' },
        ].map(({ icon: Icon, title, sub }) => (
          <div key={title} className="flex items-center gap-3 rounded-xl border border-[#E2E8F0] bg-white px-4 py-3">
            <div className="h-8 w-8 rounded-lg bg-[#F8FAFC] flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4 text-[#475569]" />
            </div>
            <div>
              <p className="text-sm font-medium text-[#0F172A]">{title}</p>
              <p className="text-xs text-[#94A3B8]">{sub}</p>
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
