import { createServerSupabaseClient } from '@/lib/supabase-server'
import { InquilinosClient } from '@/components/inquilinos/inquilinos-client'
import type { Inquilino } from '@/types'

export default async function InquilinosPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: inquilinos }, { data: imoveis }] = await Promise.all([
    supabase
      .from('inquilinos')
      .select('*, imovel:imoveis(id, apelido)')
      .eq('user_id', user.id)
      .order('criado_em', { ascending: false }),

    supabase
      .from('imoveis')
      .select('id, apelido')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('apelido', { ascending: true }),
  ])

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <InquilinosClient
        inquilinos={(inquilinos ?? []) as Inquilino[]}
        imoveis={imoveis ?? []}
      />
    </div>
  )
}
