import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ConfiguracoesClient } from '@/components/configuracoes/configuracoes-client'
import { NOTIFICACOES_PADRAO, type NotificacoesConfig } from './types'

export default async function ConfiguracoesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { count: qtdImoveis }] = await Promise.all([
    supabase
      .from('profiles')
      .select('nome, email, telefone, plano, role, criado_em, asaas_account_id, asaas_account_status')
      .eq('id', user.id)
      .single(),

    supabase
      .from('imoveis')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('ativo', true),
  ])

  // Avatar armazenado nos metadados do Supabase Auth
  const avatarUrl = (user.user_metadata?.avatar_url as string | null) ?? null

  // Config de notificações nos metadados do usuário (fallback para padrão)
  const notificacoesConfig: NotificacoesConfig = {
    ...NOTIFICACOES_PADRAO,
    ...((user.user_metadata?.notificacoes_config as Partial<NotificacoesConfig>) ?? {}),
  }

  // Admin sempre tem acesso Elite
  if (profile && profile.role === 'admin') {
    (profile as typeof profile & { plano: 'elite' }).plano = 'elite'
  }

  const pix_key = (user.user_metadata?.pix_key as string | null) ?? null
  const pix_key_tipo = (user.user_metadata?.pix_key_tipo as string | null) ?? null

  const profileData = {
    ...(profile ?? {
      nome: user.email?.split('@')[0] ?? 'Usuário',
      email: user.email ?? '',
      telefone: null,
      plano: 'gratis' as const,
      criado_em: user.created_at,
      asaas_account_id: null,
      asaas_account_status: null,
    }),
    pix_key,
    pix_key_tipo,
  }

  return (
    <ConfiguracoesClient
      profile={profileData}
      avatarUrl={avatarUrl}
      qtdImoveis={qtdImoveis ?? 0}
      notificacoesConfig={notificacoesConfig}
    />
  )
}
