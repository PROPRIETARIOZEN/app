'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'

export type InquilinoInput = {
  imovel_id: string
  nome: string
  telefone: string | null
  email: string | null
  cpf: string | null
}

export async function criarInquilino(input: InquilinoInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: inserted, error } = await supabase
    .from('inquilinos')
    .insert({ user_id: user.id, ...input })
    .select('id')
    .single()
  if (error) return { error: error.message }
  await registrarLog(user.id, 'INQUILINO_CRIADO', 'inquilino', inserted?.id, { nome: input.nome })
  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

export async function editarInquilino(id: string, input: InquilinoInput): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('inquilinos')
    .update(input)
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}

export async function desativarInquilino(id: string): Promise<{ error?: string }> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { error } = await supabase
    .from('inquilinos')
    .update({ ativo: false })
    .eq('id', id)
    .eq('user_id', user.id)
  if (error) return { error: error.message }
  revalidatePath('/inquilinos')
  revalidatePath('/imoveis')
  return {}
}
