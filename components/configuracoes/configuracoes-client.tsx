'use client'

import { useEffect, useState } from 'react'
import { User, CreditCard, Bell, ShieldCheck, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AbaPerfil } from './aba-perfil'
import { AbaAssinatura } from './aba-assinatura'
import { AbaNotificacoes } from './aba-notificacoes'
import { AbaSeguranca } from './aba-seguranca'
import { AbaAsaas } from './aba-asaas'
import type { NotificacoesConfig } from '@/app/(dashboard)/configuracoes/types'

const ABAS = [
  { id: 'perfil',       label: 'Perfil',        icon: User },
  { id: 'assinatura',   label: 'Assinatura',    icon: CreditCard },
  { id: 'cobrancas',    label: 'Cobranças',     icon: Zap },
  { id: 'notificacoes', label: 'Notificações',  icon: Bell },
  { id: 'seguranca',    label: 'Segurança',     icon: ShieldCheck },
] as const

type AbaId = typeof ABAS[number]['id']

interface Props {
  profile: {
    nome: string
    email: string
    telefone: string | null
    plano: 'gratis' | 'pago'
    criado_em: string
    asaas_account_id: string | null
    asaas_account_status: string | null
  }
  avatarUrl: string | null
  qtdImoveis: number
  notificacoesConfig: NotificacoesConfig
}

export function ConfiguracoesClient({ profile, avatarUrl, qtdImoveis, notificacoesConfig }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<AbaId>('perfil')

  useEffect(() => {
    function lerHash() {
      const hash = window.location.hash.replace('#', '') as AbaId
      if (ABAS.some(a => a.id === hash)) setAbaAtiva(hash)
    }
    lerHash()
    window.addEventListener('hashchange', lerHash)
    return () => window.removeEventListener('hashchange', lerHash)
  }, [])

  function trocarAba(id: AbaId) {
    setAbaAtiva(id)
    window.history.replaceState(null, '', `#${id}`)
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight text-[#0F172A]">Configurações</h1>
        <p className="text-sm text-[#475569] mt-0.5">Gerencie sua conta e preferências</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs laterais */}
        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible lg:w-52 shrink-0 pb-1 lg:pb-0">
          {ABAS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => trocarAba(id)}
              className={cn(
                'relative flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left',
                abaAtiva === id
                  ? 'bg-[#D1FAE5] text-[#065F46]'
                  : 'text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]',
              )}
            >
              {abaAtiva === id && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#059669]" />
              )}
              <Icon className={cn('h-4 w-4 shrink-0', abaAtiva === id ? 'text-[#059669]' : 'text-[#94A3B8]')} />
              {label}
            </button>
          ))}
        </nav>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {abaAtiva === 'perfil' && <AbaPerfil profile={profile} avatarUrl={avatarUrl} qtdImoveis={qtdImoveis} />}
          {abaAtiva === 'assinatura' && <AbaAssinatura plano={profile.plano} />}
          {abaAtiva === 'cobrancas' && (
            <AbaAsaas
              asaasAccountId={profile.asaas_account_id}
              asaasAccountStatus={profile.asaas_account_status}
              profileNome={profile.nome}
              profileEmail={profile.email}
              profileTelefone={profile.telefone}
            />
          )}
          {abaAtiva === 'notificacoes' && <AbaNotificacoes config={notificacoesConfig} />}
          {abaAtiva === 'seguranca' && <AbaSeguranca email={profile.email} />}
        </div>
      </div>
    </div>
  )
}
