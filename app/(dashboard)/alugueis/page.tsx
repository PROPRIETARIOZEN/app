import { createServerSupabaseClient } from '@/lib/supabase-server'
import { AlugueisClient, type AluguelItem } from '@/components/alugueis/alugueis-client'
import type { AnoResumoItem } from '@/components/alugueis/calendario-anual'
import { gerarAlugueisMes, atualizarStatusAtrasados } from './actions'

export default async function AlugueisPage({
  searchParams,
}: {
  searchParams: { mes?: string; cobrar?: string; view?: string; ano?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const hoje = new Date()
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`
  const mesParam = searchParams.mes ?? mesAtual
  const mesReferencia = `${mesParam}-01`
  const viewParam = searchParams.view ?? 'lista'
  const anoParam = searchParams.ano ?? mesParam.slice(0, 4)
  const anoNum = parseInt(anoParam)

  // Gera registros faltantes + atualiza atrasados em paralelo
  await Promise.all([
    gerarAlugueisMes(mesReferencia),
    atualizarStatusAtrasados(),
  ])

  const [{ data: alugueis }, { data: profile }, { data: alugueiAno }] = await Promise.all([
    supabase
      .from('alugueis')
      .select(`
        id, valor, data_vencimento, data_pagamento, status,
        mes_referencia, observacao, recibo_gerado,
        asaas_charge_id, asaas_pix_qrcode, asaas_pix_copiaecola,
        asaas_boleto_url, valor_pago, metodo_pagamento,
        desconto, motivo_cancelamento, isento, motivo_isencao,
        lembrete_enviado_em, recibo_reenviado_em,
        imovel:imoveis!inner(apelido, endereco, user_id, billing_mode),
        inquilino:inquilinos(nome, cpf, email, telefone)
      `)
      .eq('mes_referencia', mesReferencia)
      .eq('imovel.user_id', user.id)
      .order('data_vencimento', { ascending: true }),

    supabase
      .from('profiles')
      .select('nome, email, telefone, plano')
      .eq('id', user.id)
      .single(),

    // Dados anuais para o calendário (todos os meses do ano selecionado)
    supabase
      .from('alugueis')
      .select('valor, status, mes_referencia, imovel:imoveis!inner(user_id)')
      .eq('imovel.user_id', user.id)
      .gte('mes_referencia', `${anoNum}-01-01`)
      .lte('mes_referencia', `${anoNum}-12-31`)
      .neq('status', 'cancelado')
      .neq('status', 'estornado'),
  ])

  const pix_key = (user.user_metadata?.pix_key as string | null) ?? null
  const pix_key_tipo = (user.user_metadata?.pix_key_tipo as string | null) ?? null

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <AlugueisClient
        alugueis={(alugueis ?? []) as unknown as AluguelItem[]}
        mesSelecionado={mesParam}
        cobrarId={searchParams.cobrar ?? null}
        view={viewParam}
        anoSelecionado={anoParam}
        anoData={(alugueiAno ?? []) as unknown as AnoResumoItem[]}
        profile={profile
          ? {
              nome: profile.nome ?? '',
              email: profile.email ?? (user.email ?? ''),
              telefone: profile.telefone ?? null,
              plano: (profile.plano as 'gratis' | 'pago' | 'elite') ?? 'gratis',
              pix_key,
              pix_key_tipo,
            }
          : { nome: '', email: user.email ?? '', telefone: null, plano: 'gratis' as const, pix_key, pix_key_tipo }
        }
      />
    </div>
  )
}
