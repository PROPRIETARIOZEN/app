import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ token: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { token } = await params
  if (!token || token.length !== 64)
    return NextResponse.json({ error: 'Token inválido.' }, { status: 400 })

  const admin = createAdminClient()

  // Valida token
  const { data: tokenRow } = await admin
    .from('inquilino_tokens')
    .select('id, inquilino_id, user_id, ativo')
    .eq('token', token)
    .maybeSingle()

  if (!tokenRow || !tokenRow.ativo)
    return NextResponse.json({ error: 'Link inválido ou revogado.' }, { status: 404 })

  const inquilinoId = tokenRow.inquilino_id

  // Atualiza ultimo_acesso (fire-and-forget)
  admin
    .from('inquilino_tokens')
    .update({ ultimo_acesso: new Date().toISOString() })
    .eq('id', tokenRow.id)
    .then(() => { /* ignora */ })

  // Busca inquilino + imóvel em paralelo com proprietário
  const [inqResult, propResult] = await Promise.all([
    admin
      .from('inquilinos')
      .select('id, nome, telefone, imovel:imoveis(id, apelido, endereco, tipo, valor_aluguel, dia_vencimento, observacoes)')
      .eq('id', inquilinoId)
      .single(),
    admin
      .from('profiles')
      .select('nome, telefone')
      .eq('id', tokenRow.user_id)
      .maybeSingle(),
  ])

  if (inqResult.error || !inqResult.data)
    return NextResponse.json({ error: 'Dados não encontrados.' }, { status: 404 })

  const inquilino = inqResult.data
  const proprietario = propResult.data

  const imovel = inquilino.imovel as {
    id: string; apelido: string; endereco: string; tipo: string
    valor_aluguel: number; dia_vencimento: number; observacoes: string | null
  } | null

  // Busca alugueis e documentos em paralelo
  const [alugueisResult, docsResult] = await Promise.all([
    admin
      .from('alugueis')
      .select('id, mes_referencia, valor, data_vencimento, status, data_pagamento, valor_pago')
      .eq('imovel_id', imovel?.id ?? '')
      .order('data_vencimento', { ascending: false })
      .limit(24),
    admin
      .from('documentos_inquilino')
      .select('id, tipo, nome_arquivo, tamanho_bytes, mime_type, descricao, criado_em')
      .eq('inquilino_id', inquilinoId)
      .order('criado_em', { ascending: false }),
  ])

  const alugueis  = alugueisResult.data ?? []
  const documentos = docsResult.data ?? []

  // Próximo aluguel pendente/atrasado
  const proximoVencimento = alugueis.find(
    a => a.status === 'pendente' || a.status === 'atrasado',
  ) ?? null

  return NextResponse.json({
    inquilino: {
      nome:     inquilino.nome,
      telefone: inquilino.telefone,
    },
    imovel: imovel ? {
      apelido:        imovel.apelido,
      endereco:       imovel.endereco,
      tipo:           imovel.tipo,
      valor_aluguel:  imovel.valor_aluguel,
      dia_vencimento: imovel.dia_vencimento,
      observacoes:    imovel.observacoes,
    } : null,
    proprietario: proprietario ? {
      nome:     proprietario.nome,
      telefone: proprietario.telefone,
    } : null,
    proximoVencimento,
    historico:  alugueis,
    documentos,
  })
}
