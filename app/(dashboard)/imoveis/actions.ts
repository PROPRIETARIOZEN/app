'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'

export type ImovelInput = {
  apelido: string
  endereco: string
  tipo: 'apartamento' | 'casa' | 'kitnet' | 'comercial' | 'terreno' | 'outro'
  valor_aluguel: number
  dia_vencimento: number
  data_inicio_contrato: string | null
  data_proximo_reajuste: string | null
  indice_reajuste: 'igpm' | 'ipca' | 'fixo'
  percentual_fixo: number | null
  observacoes: string | null
  billing_mode: 'MANUAL' | 'AUTOMATIC'
  multa_percentual: number
  juros_percentual: number
  desconto_percentual: number
}

export async function criarImovel(input: ImovelInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inserted, error } = await supabase
    .from('imoveis')
    .insert({ user_id: user.id, ...input })
    .select('id')
    .single()
  if (error) return { error: error.message }
  await registrarLog(user.id, 'IMOVEL_CRIADO', 'imovel', inserted?.id, { apelido: input.apelido })
  revalidatePath('/imoveis')
  return {}
}

export async function editarImovel(id: string, input: ImovelInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Ler estado atual antes de atualizar
  const { data: imovelAtual } = await supabase
    .from('imoveis')
    .select('dia_vencimento, data_inicio_contrato')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  const { error } = await supabase
    .from('imoveis')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }

  // Se o dia de vencimento mudou, recalcular data_vencimento dos aluguéis
  // pendentes/atrasados do mês atual em diante (não altera histórico pago)
  if (imovelAtual && imovelAtual.dia_vencimento !== input.dia_vencimento) {
    const hoje = new Date()
    const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-01`

    const { data: pendentes } = await supabase
      .from('alugueis')
      .select('id, mes_referencia')
      .eq('imovel_id', id)
      .gte('mes_referencia', mesAtualStr)
      .in('status', ['pendente', 'atrasado'])

    if (pendentes?.length) {
      for (const aluguel of pendentes) {
        const [anoStr, mesStr] = aluguel.mes_referencia.split('-')
        const ano = parseInt(anoStr)
        const mes = parseInt(mesStr)
        const ultimoDia = new Date(ano, mes, 0).getDate()
        const dia = Math.min(input.dia_vencimento, ultimoDia)
        const novaData = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
        await supabase.from('alugueis').update({ data_vencimento: novaData }).eq('id', aluguel.id)
      }
    }
  }

  // Se data_inicio_contrato avançou, cancelar aluguéis pendentes/atrasados antes do novo início
  if (imovelAtual && input.data_inicio_contrato &&
      input.data_inicio_contrato !== imovelAtual.data_inicio_contrato) {
    const inicioMesStr = `${input.data_inicio_contrato.slice(0, 7)}-01` // YYYY-MM-01
    await supabase
      .from('alugueis')
      .update({ status: 'cancelado' })
      .eq('imovel_id', id)
      .lt('mes_referencia', inicioMesStr)
      .in('status', ['pendente', 'atrasado'])
  }

  revalidatePath('/imoveis')
  revalidatePath('/alugueis')
  revalidatePath('/dashboard')
  return {}
}

export async function arquivarImovel(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('imoveis')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/imoveis')
  return {}
}
