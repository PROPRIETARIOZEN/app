'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  Loader2, CheckCircle2, Clock, AlertTriangle, Zap, RefreshCw,
  Building2, User, Phone, MapPin, Hash,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

// ── Status ────────────────────────────────────────────────────────────────────

type AsaasStatus = 'PENDING' | 'AWAITING_SEND_ASAAS_DOCUMENTS' | 'APPROVED' | 'REJECTED' | 'DISABLED'

const STATUS_INFO: Record<AsaasStatus, { label: string; icon: typeof CheckCircle2; cls: string; desc: string }> = {
  PENDING: {
    label: 'Pendente',
    icon: Clock,
    cls: 'bg-amber-100 text-amber-700',
    desc: 'Sua conta foi criada. Verifique o e-mail do Asaas para definir sua senha e enviar os documentos.',
  },
  AWAITING_SEND_ASAAS_DOCUMENTS: {
    label: 'Aguardando documentos',
    icon: Clock,
    cls: 'bg-blue-100 text-blue-700',
    desc: 'Faça login no painel Asaas e envie os documentos solicitados para ativar sua conta.',
  },
  APPROVED: {
    label: 'Aprovada',
    icon: CheckCircle2,
    cls: 'bg-emerald-100 text-emerald-700',
    desc: 'Sua conta está ativa e pronta para cobrar aluguéis via PIX e boleto.',
  },
  REJECTED: {
    label: 'Reprovada',
    icon: AlertTriangle,
    cls: 'bg-red-100 text-red-700',
    desc: 'Sua conta foi reprovada pelo Asaas. Entre em contato com o suporte para mais informações.',
  },
  DISABLED: {
    label: 'Desativada',
    icon: AlertTriangle,
    cls: 'bg-slate-100 text-slate-600',
    desc: 'Sua conta Asaas está desativada.',
  },
}

// ── Formulário de onboarding ──────────────────────────────────────────────────

const schema = z.object({
  name:          z.string().min(3, 'Nome completo obrigatório'),
  email:         z.string().email('E-mail inválido'),
  cpfCnpj:       z.string().min(11, 'CPF ou CNPJ obrigatório').max(18),
  mobilePhone:   z.string().min(10, 'Telefone celular obrigatório'),
  postalCode:    z.string().min(8, 'CEP obrigatório').max(9),
  address:       z.string().min(3, 'Logradouro obrigatório'),
  addressNumber: z.string().min(1, 'Número obrigatório'),
  province:      z.string().min(2, 'Bairro obrigatório'),
  birthDate:     z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface Props {
  asaasAccountId:     string | null
  asaasAccountStatus: string | null
  profileNome:        string
  profileEmail:       string
  profileTelefone:    string | null
}

export function AbaAsaas({
  asaasAccountId,
  asaasAccountStatus,
  profileNome,
  profileEmail,
  profileTelefone,
}: Props) {
  const [status, setStatus] = useState<{ id: string; status: string } | null>(
    asaasAccountId ? { id: asaasAccountId, status: asaasAccountStatus ?? 'PENDING' } : null,
  )
  const [refreshing, setRefreshing] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:        profileNome,
      email:       profileEmail,
      mobilePhone: profileTelefone ?? '',
    },
  })

  // ── Atualizar status ────────────────────────────────────────────────────────
  async function handleRefreshStatus() {
    setRefreshing(true)
    try {
      const res = await fetch('/api/asaas/status')
      if (!res.ok) {
        const err = await res.json() as { error?: string }
        toast.error(err.error ?? 'Falha ao consultar status.')
        return
      }
      const data = await res.json() as { accountStatus: string; asaasId: string }
      setStatus({ id: data.asaasId, status: data.accountStatus })
      toast.success('Status atualizado!')
    } finally {
      setRefreshing(false)
    }
  }

  // ── Criar conta ─────────────────────────────────────────────────────────────
  async function onSubmit(data: FormData) {
    const res = await fetch('/api/asaas/onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const body = await res.json() as { error?: string; asaasId?: string; accountStatus?: string; message?: string }

    if (!res.ok) {
      toast.error(body.error ?? 'Erro ao criar conta Asaas.')
      return
    }

    setStatus({ id: body.asaasId!, status: body.accountStatus ?? 'PENDING' })
    toast.success(body.message ?? 'Conta criada com sucesso!')
  }

  // ── Conta já vinculada: exibir painel de status ─────────────────────────────
  if (status) {
    const info = STATUS_INFO[status.status as AsaasStatus] ?? STATUS_INFO.PENDING
    const Icon = info.icon

    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-[#0F172A]">Cobrança automática (Asaas)</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Conta vinculada — cobranças via PIX e boleto para seus inquilinos.
          </p>
        </div>

        <Card>
          <CardContent className="pt-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${info.cls.split(' ').map(c => c.replace('text-', 'bg-').replace('-700', '-100').replace('-600', '-100')).join(' ')}`}>
                  <Icon className={`h-5 w-5 ${info.cls.split(' ').find(c => c.startsWith('text-'))}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Status da conta</p>
                  <Badge className={`mt-0.5 text-xs font-semibold ${info.cls}`}>{info.label}</Badge>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 shrink-0"
                disabled={refreshing}
                onClick={handleRefreshStatus}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            <p className="text-sm text-slate-600">{info.desc}</p>

            <div className="rounded-lg bg-slate-50 border border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-400 font-mono">ID Asaas: {status.id}</p>
            </div>

            {(status.status === 'PENDING' || status.status === 'AWAITING_SEND_ASAAS_DOCUMENTS') && (
              <a
                href="https://www.asaas.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-emerald-600 font-medium hover:underline"
              >
                Acessar painel Asaas →
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ── Sem conta: exibir formulário de onboarding ──────────────────────────────
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold text-[#0F172A]">Ativar cobrança automática</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Crie sua subconta gratuita no Asaas para cobrar aluguéis via PIX e boleto diretamente dos inquilinos.
        </p>
      </div>

      {/* Benefícios */}
      <Card className="border-emerald-100 bg-emerald-50/40">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-semibold text-emerald-800">O que você ganha</span>
          </div>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {[
              'Geração automática de PIX e boleto por imóvel',
              'Confirmação de pagamento em tempo real via webhook',
              'Cobrança automática com multa e juros configuráveis',
              'Subconta gratuita — taxas por transação apenas',
            ].map(item => (
              <li key={item} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Formulário */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Dados cadastrais</CardTitle>
          <CardDescription className="text-xs">
            Preencha os dados para criar sua subconta no Asaas. Eles devem corresponder ao CPF ou CNPJ do proprietário.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome + E-mail */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="as-name" className="flex items-center gap-1.5 text-xs">
                  <User className="h-3 w-3" /> Nome completo
                </Label>
                <Input id="as-name" placeholder="Maria da Silva" {...register('name')} />
                {errors.name && <p className="text-destructive text-xs">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-email" className="flex items-center gap-1.5 text-xs">
                  E-mail
                </Label>
                <Input id="as-email" type="email" placeholder="maria@exemplo.com" {...register('email')} />
                {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
              </div>
            </div>

            {/* CPF/CNPJ + Telefone + Data nascimento */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="as-cpf" className="flex items-center gap-1.5 text-xs">
                  <Hash className="h-3 w-3" /> CPF ou CNPJ
                </Label>
                <Input id="as-cpf" placeholder="000.000.000-00" {...register('cpfCnpj')} />
                {errors.cpfCnpj && <p className="text-destructive text-xs">{errors.cpfCnpj.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-phone" className="flex items-center gap-1.5 text-xs">
                  <Phone className="h-3 w-3" /> Celular
                </Label>
                <Input id="as-phone" placeholder="(11) 91234-5678" {...register('mobilePhone')} />
                {errors.mobilePhone && <p className="text-destructive text-xs">{errors.mobilePhone.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-birth" className="text-xs">Nascimento (opcional)</Label>
                <Input id="as-birth" type="date" {...register('birthDate')} />
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-1.5">
              <Label htmlFor="as-cep" className="flex items-center gap-1.5 text-xs">
                <MapPin className="h-3 w-3" /> CEP
              </Label>
              <Input id="as-cep" placeholder="00000-000" maxLength={9} {...register('postalCode')} />
              {errors.postalCode && <p className="text-destructive text-xs">{errors.postalCode.message}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="as-address" className="text-xs">Logradouro</Label>
                <Input id="as-address" placeholder="Rua das Flores" {...register('address')} />
                {errors.address && <p className="text-destructive text-xs">{errors.address.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="as-num" className="text-xs">Número</Label>
                <Input id="as-num" placeholder="123" {...register('addressNumber')} />
                {errors.addressNumber && <p className="text-destructive text-xs">{errors.addressNumber.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="as-prov" className="flex items-center gap-1.5 text-xs">
                <Building2 className="h-3 w-3" /> Bairro
              </Label>
              <Input id="as-prov" placeholder="Centro" {...register('province')} />
              {errors.province && <p className="text-destructive text-xs">{errors.province.message}</p>}
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Ao confirmar, uma subconta gratuita será criada no Asaas. Você receberá um e-mail para
              definir sua senha e enviar os documentos. A aprovação costuma levar 1–2 dias úteis.
            </p>

            <div className="flex justify-end">
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar conta Asaas
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
