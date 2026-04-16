import { randomBytes } from 'crypto'
import { createAdminClient } from './supabase-server'

/** Gera um token hex aleatório de 64 caracteres (32 bytes). */
export function gerarTokenInquilino(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Busca token ativo existente ou cria um novo para o inquilino.
 * Retorna o token (string hex).
 */
export async function criarOuBuscarTokenInquilino(
  inquilinoId: string,
  userId: string,
): Promise<string> {
  const admin = createAdminClient()

  // Verifica se já existe token ativo
  const { data: existente } = await admin
    .from('inquilino_tokens')
    .select('token')
    .eq('inquilino_id', inquilinoId)
    .eq('ativo', true)
    .maybeSingle()

  if (existente?.token) return existente.token

  // Cria novo token
  const token = gerarTokenInquilino()
  const { error } = await admin.from('inquilino_tokens').insert({
    inquilino_id: inquilinoId,
    user_id: userId,
    token,
    ativo: true,
  })
  if (error) throw new Error(`Erro ao criar token: ${error.message}`)

  return token
}
