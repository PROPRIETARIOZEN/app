import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AlugueisClient, type AluguelItem } from '@/components/alugueis/alugueis-client'
import { gerarAlugueisMes, atualizarStatusAtrasados } from './actions'

export default async function AlugueisPage({
  searchParams,
}: {
  searchParams: { mes?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const mesParam = searchParams.mes ?? mesAtual
  const mesReferencia = `${mesParam}-01`

  // Gera registros faltantes + atualiza atrasados em paralelo
  // Meses futuros também são gerados quando o usuário navega até eles;
  // gerarAlugueisMes já respeita data_inicio_contrato de cada imóvel.
  await Promise.all([
    gerarAlugueisMes(mesReferencia),
    atualizarStatusAtrasados(),
  ])

  const [{ data: alugueis }, { data: profile }] = await Promise.all([
    supabase
      .from('alugueis')
      .select(`
        id, valor, data_vencimento, data_pagamento, status,
        mes_referencia, observacao, recibo_gerado,
        asaas_charge_id, asaas_pix_qrcode, asaas_pix_copiaecola,
        asaas_boleto_url, valor_pago, metodo_pagamento,
        imovel:imoveis!inner(apelido, endereco, user_id, billing_mode),
        inquilino:inquilinos(nome, cpf, email, telefone)
      `)
      .eq('mes_referencia', mesReferencia)
      .eq('imovel.user_id', user.id)
      .order('data_vencimento', { ascending: true }),

    supabase
      .from('profiles')
      .select('nome, email, telefone')
      .eq('id', user.id)
      .single(),
  ])

  const pix_key = (user.user_metadata?.pix_key as string | null) ?? null
  const pix_key_tipo = (user.user_metadata?.pix_key_tipo as string | null) ?? null

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <AlugueisClient
        alugueis={(alugueis ?? []) as AluguelItem[]}
        mesSelecionado={mesParam}
        profile={profile
          ? { ...profile, pix_key, pix_key_tipo }
          : { nome: '', email: user.email ?? '', telefone: null, pix_key, pix_key_tipo }
        }
      />
    </div>
  )
}
