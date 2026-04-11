'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'

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
}

export async function criarImovel(input: ImovelInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase.from('imoveis').insert({ user_id: user.id, ...input })
  if (error) return { error: error.message }
  revalidatePath('/imoveis')
  return {}
}

export async function editarImovel(id: string, input: ImovelInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('imoveis')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/imoveis')
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
