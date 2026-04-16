import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { criarOuBuscarTokenInquilino } from '@/lib/tokens'
import { enviarConviteInquilino } from '@/lib/email'

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

  // Busca inquilino com imóvel
  const { data: inquilino, error: errInq } = await admin
    .from('inquilinos')
    .select('id, user_id, nome, email, imovel:imoveis(apelido, endereco)')
    .eq('id', inquilinoId)
    .eq('user_id', user.id)
    .single()

  if (errInq || !inquilino)
    return NextResponse.json({ error: 'Inquilino não encontrado.' }, { status: 404 })

  if (!inquilino.email)
    return NextResponse.json({ error: 'O inquilino não possui e-mail cadastrado.' }, { status: 422 })

  // Busca nome do proprietário
  const { data: profile } = await admin
    .from('profiles')
    .select('nome')
    .eq('id', user.id)
    .single()

  const nomeProprietario = profile?.nome ?? 'Proprietário'

  // Cria ou busca token ativo
  const token = await criarOuBuscarTokenInquilino(inquilinoId, user.id)

  const imovel = inquilino.imovel as { apelido: string; endereco: string } | null
  const _raw   = process.env.NEXT_PUBLIC_APP_URL ?? ''
  const appUrl = _raw && !_raw.includes('localhost') && !_raw.includes('127.0.0.1')
    ? _raw
    : 'https://proprietariozen.com.br'
  const link = `${appUrl}/inquilino/${token}`

  // Envia e-mail — erros surfacam com mensagem clara para o cliente
  try {
    await enviarConviteInquilino({
      para:             inquilino.email,
      nomeInquilino:    inquilino.nome,
      nomeProprietario,
      nomeImovel:       imovel?.apelido ?? 'Imóvel',
      enderecoImovel:   imovel?.endereco ?? '',
      token,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[enviar-convite] falha Resend:', msg)
    return NextResponse.json(
      { error: `Não foi possível enviar o e-mail: ${msg}` },
      { status: 502 },
    )
  }

  // Atualiza convite_enviado_em apenas se o envio teve sucesso
  await admin
    .from('inquilinos')
    .update({ convite_enviado_em: new Date().toISOString() })
    .eq('id', inquilinoId)

  return NextResponse.json({
    ok:          true,
    link,
    enviado_para: inquilino.email,
  })
}
