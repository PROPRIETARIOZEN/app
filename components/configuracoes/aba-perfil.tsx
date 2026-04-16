'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Camera, Lock, Building2 } from 'lucide-react'
import { LIMITES_PLANO, isPlanoPago } from '@/lib/stripe'
import type { PlanoTipo } from '@/lib/stripe'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { atualizarPerfil, obterUrlUploadAvatar, salvarFotoPerfilUrl } from '@/app/(dashboard)/configuracoes/actions'
import { formatarData } from '@/lib/helpers'

const PIX_TIPOS = [
  { value: 'cpf',       label: 'CPF' },
  { value: 'cnpj',      label: 'CNPJ' },
  { value: 'email',     label: 'E-mail' },
  { value: 'telefone',  label: 'Telefone' },
  { value: 'aleatoria', label: 'Chave aleatória' },
] as const

const schema = z.object({
  nome: z.string().min(2, 'Mínimo 2 caracteres'),
  telefone: z.string().optional(),
  cpf: z.string().optional(),
  nome_recibo: z.string().optional(),
  pix_key_tipo: z.string().optional(),
  pix_key: z.string().optional(),
})

type FormData = z.infer<typeof schema>

function mascaraTelefone(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

function mascaraCPF(v: string) {
  const n = v.replace(/\D/g, '').slice(0, 11)
  return n
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

interface Props {
  profile: {
    nome: string
    email: string
    telefone: string | null
    plano: 'gratis' | 'pago' | 'elite'
    criado_em: string
    pix_key?: string | null
    pix_key_tipo?: string | null
  }
  avatarUrl: string | null
  qtdImoveis: number
}

export function AbaPerfil({ profile, avatarUrl, qtdImoveis }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(avatarUrl)
  const fileRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      nome: profile.nome,
      telefone: profile.telefone ?? '',
      cpf: '',
      nome_recibo: profile.nome,
      pix_key_tipo: profile.pix_key_tipo ?? '',
      pix_key: profile.pix_key ?? '',
    },
  })

  const limiteImoveis = LIMITES_PLANO[profile.plano as PlanoTipo].imoveis.toString()
  const iniciaisNome = profile.nome
    .split(' ')
    .slice(0, 2)
    .map(p => p[0])
    .join('')
    .toUpperCase()

  async function onSubmit(data: FormData) {
    setSaving(true)
    try {
      const result = await atualizarPerfil({
        nome: data.nome,
        telefone: data.telefone ? data.telefone.replace(/\D/g, '') : null,
        cpf: data.cpf ? data.cpf.replace(/\D/g, '') : null,
        nome_recibo: data.nome_recibo || null,
        pix_key: data.pix_key || null,
        pix_key_tipo: data.pix_key || null ? (data.pix_key_tipo || null) : null,
      })
      if (result.error) toast.error(result.error)
      else { toast.success('Perfil atualizado!'); router.refresh() }
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem deve ter no máximo 2 MB'); return }

    setUploadingAvatar(true)
    try {
      const { url, path, error } = await obterUrlUploadAvatar()
      if (error || !url || !path) { toast.error(error ?? 'Erro ao obter URL de upload'); return }

      const res = await fetch(url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!res.ok) { toast.error('Erro ao fazer upload da imagem'); return }

      // Gera URL pública
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/avatars/${path}?t=${Date.now()}`

      const saveResult = await salvarFotoPerfilUrl(publicUrl)
      if (saveResult.error) { toast.error(saveResult.error); return }

      setPreviewAvatar(publicUrl)
      toast.success('Foto atualizada!')
      router.refresh()
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Foto de perfil */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Foto de perfil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-5">
              <div className="relative">
                <Avatar size="lg" className="h-20 w-20">
                  {previewAvatar && <AvatarImage src={previewAvatar} alt={profile.nome} />}
                  <AvatarFallback className="text-xl font-semibold">{iniciaisNome}</AvatarFallback>
                </Avatar>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-[#059669] text-white shadow-md hover:bg-[#047857] transition-colors disabled:opacity-50"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Camera className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div>
                <p className="text-sm font-medium">{profile.nome}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{profile.email}</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="mt-2 text-xs text-[#059669] hover:underline disabled:opacity-50"
                >
                  {uploadingAvatar ? 'Enviando...' : 'Alterar foto'}
                </button>
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </CardContent>
        </Card>

        {/* Dados pessoais */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Dados pessoais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="nome">Nome completo</Label>
              <Input id="nome" {...register('nome')} />
              {errors.nome && <p className="text-xs text-destructive">{errors.nome.message}</p>}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Label htmlFor="email">E-mail</Label>
                <Badge variant="outline" className="text-xs gap-1">
                  <Lock className="h-2.5 w-2.5" />
                  não editável
                </Badge>
              </div>
              <Input id="email" value={profile.email} disabled className="bg-[#F1F5F9]" readOnly />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  placeholder="(11) 99999-9999"
                  {...register('telefone')}
                  onChange={e => setValue('telefone', mascaraTelefone(e.target.value))}
                  value={watch('telefone')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cpf">CPF (opcional)</Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  {...register('cpf')}
                  onChange={e => setValue('cpf', mascaraCPF(e.target.value))}
                  value={watch('cpf')}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="nome_recibo">Nome nos recibos</Label>
              <Input
                id="nome_recibo"
                placeholder="Nome que aparece como locador nos recibos PDF"
                {...register('nome_recibo')}
              />
              <p className="text-xs text-muted-foreground">
                Pode ser diferente do nome de login. Usado nos recibos de aluguel.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Chave PIX */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Chave PIX para recebimento</CardTitle>
            <CardDescription>
              Informe sua chave PIX para que os inquilinos possam transferir diretamente para você.
              Disponível para todos os planos.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="pix_key_tipo">Tipo de chave</Label>
                <select
                  id="pix_key_tipo"
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring"
                  {...register('pix_key_tipo')}
                >
                  <option value="">Selecione o tipo</option>
                  {PIX_TIPOS.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pix_key">Chave PIX</Label>
                <Input
                  id="pix_key"
                  placeholder="Informe sua chave PIX"
                  {...register('pix_key')}
                />
              </div>
            </div>
            {watch('pix_key') && (
              <p className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                Sua chave PIX será exibida nas instruções de pagamento enviadas aos inquilinos.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Dados da conta */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Dados da conta</CardTitle>
            <CardDescription>Informações sobre sua conta e plano</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Membro desde</span>
              <span className="text-sm font-medium">{formatarData(profile.criado_em)}</span>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Plano atual</span>
              <Badge
                className={isPlanoPago(profile.plano as PlanoTipo)
                  ? profile.plano === 'elite'
                    ? 'bg-[#EDE9FE] text-[#5B21B6] hover:bg-[#EDE9FE] font-semibold border-0'
                    : 'bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] font-semibold border-0'
                  : 'bg-[#F1F5F9] text-[#475569] hover:bg-[#F1F5F9] border-0'}
              >
                {LIMITES_PLANO[profile.plano as PlanoTipo].nome}
              </Badge>
            </div>
            <Separator />
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5" />
                Imóveis cadastrados
              </span>
              <span className="text-sm font-medium">
                {qtdImoveis} / {limiteImoveis}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="gap-2 bg-[#059669] hover:bg-[#047857]">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar perfil
          </Button>
        </div>
      </form>
    </div>
  )
}
