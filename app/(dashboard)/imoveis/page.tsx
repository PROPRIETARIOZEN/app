import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ImoveisClient } from '@/components/imoveis/imoveis-client'
import type { Imovel } from '@/types'

export default async function ImoveisPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const agora = new Date()
  const mesAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`

  const [{ data }, { data: profile }, { data: alugueisMes }] = await Promise.all([
    supabase
      .from('imoveis')
      .select('*, inquilinos(id, nome, ativo)')
      .eq('user_id', user.id)
      .eq('ativo', true)
      .order('criado_em', { ascending: false }),

    supabase
      .from('profiles')
      .select('plano, role')
      .eq('id', user.id)
      .single(),

    supabase
      .from('alugueis')
      .select('imovel_id, status, data_pagamento, data_vencimento')
      .gte('mes_referencia', mesAtual)
      .lte('mes_referencia', mesAtual.slice(0, 7) + '-31'),
  ])

  const plano = (profile?.role === 'admin' || profile?.plano === 'pago' ? 'pago' : 'gratis') as 'gratis' | 'pago'

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <ImoveisClient
        imoveis={(data ?? []) as Imovel[]}
        plano={plano}
        alugueisMes={(alugueisMes ?? []) as { imovel_id: string; status: string; data_pagamento: string | null; data_vencimento: string }[]}
      />
    </div>
  )
}
