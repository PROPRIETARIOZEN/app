import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { enviarCobrancaParaInquilino } from '@/lib/email'

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const admin = createAdminClient()

    // Busca aluguel com imovel e inquilino
    const { data: aluguel, error: aluguelErr } = await admin
      .from('alugueis')
      .select(`
        id, valor, data_vencimento, mes_referencia,
        asaas_pix_copiaecola, asaas_boleto_url,
        imovel:imoveis!inner(apelido, user_id, billing_mode),
        inquilino:inquilinos(nome, email)
      `)
      .eq('id', params.id)
      .single()

    if (aluguelErr || !aluguel) {
      return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })
    }

    // Verifica propriedade
    const imovel = aluguel.imovel as { apelido: string; user_id: string; billing_mode: string | null } | null
    if (imovel?.user_id !== user.id) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const inquilino = aluguel.inquilino as { nome: string; email: string | null } | null
    if (!inquilino?.email) {
      return NextResponse.json({ error: 'Inquilino sem e-mail cadastrado' }, { status: 400 })
    }

    // Perfil do proprietário
    const { data: profile } = await admin
      .from('profiles')
      .select('nome')
      .eq('id', user.id)
      .single()

    const pixKey = (user.user_metadata?.pix_key as string | null) ?? null
    const pixKeyTipo = (user.user_metadata?.pix_key_tipo as string | null) ?? null
    const isAutomatic = imovel?.billing_mode === 'AUTOMATIC'

    await enviarCobrancaParaInquilino({
      para: inquilino.email,
      nomeInquilino: inquilino.nome,
      nomeProprietario: profile?.nome ?? 'Proprietário',
      nomeImovel: imovel?.apelido ?? '',
      valor: aluguel.valor,
      mesReferencia: aluguel.mes_referencia,
      dataVencimento: aluguel.data_vencimento,
      pixKey:            isAutomatic ? null : pixKey,
      pixKeyTipo:        isAutomatic ? null : pixKeyTipo,
      asaasPixCopiaECola: isAutomatic ? (aluguel.asaas_pix_copiaecola ?? null) : null,
      assasBoletoUrl:     isAutomatic ? (aluguel.asaas_boleto_url ?? null) : null,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[enviar-cobranca] Erro:', msg)
    return NextResponse.json({ error: 'Erro ao enviar e-mail', detail: msg }, { status: 500 })
  }
}
