import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  let body: { inquilinoId?: string }
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const { inquilinoId } = body
  if (!inquilinoId) return NextResponse.json({ error: 'inquilinoId é obrigatório.' }, { status: 422 })

  const admin = createAdminClient()

  // Verifica que o inquilino pertence ao usuário
  const { data: inq } = await admin
    .from('inquilinos')
    .select('id')
    .eq('id', inquilinoId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!inq) return NextResponse.json({ error: 'Inquilino não encontrado.' }, { status: 404 })

  // Desativa todos os tokens ativos do inquilino
  const { error } = await admin
    .from('inquilino_tokens')
    .update({ ativo: false })
    .eq('inquilino_id', inquilinoId)
    .eq('ativo', true)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
