import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const CIPHER = 'aes-256-gcm'

function encryptionKey(): Buffer {
  const hex = process.env.ASAAS_ENCRYPTION_KEY ?? ''
  if (hex.length !== 64) throw new Error('ASAAS_ENCRYPTION_KEY deve ter 64 caracteres hex.')
  return Buffer.from(hex, 'hex')
}

function decryptApiKey(enc: string): string {
  const parts = enc.split(':')
  if (parts.length !== 3) throw new Error('Formato de apiKey inválido.')
  const [ivHex, tagHex, ctHex] = parts
  const key = encryptionKey()
  const decipher = crypto.createDecipheriv(CIPHER, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return decipher.update(Buffer.from(ctHex, 'hex'), undefined, 'utf8') + decipher.final('utf8')
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({})) as { aluguelId?: string }
  if (!body.aluguelId) return NextResponse.json({ error: 'aluguelId obrigatório' }, { status: 400 })
  const { aluguelId } = body

  const admin = createAdminClient()

  // Load aluguel with imovel and inquilino
  const { data: aluguel } = await admin
    .from('alugueis')
    .select(`
      id, valor, data_vencimento, mes_referencia, status,
      imovel:imoveis!inner(id, apelido, billing_mode, user_id),
      inquilino:inquilinos(id, nome, cpf, email, telefone, asaas_customer_id)
    `)
    .eq('id', aluguelId)
    .eq('imovel.user_id', user.id)
    .single()

  if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })
  if (aluguel.status === 'pago') return NextResponse.json({ error: 'Aluguel já está pago' }, { status: 400 })

  const imovel = Array.isArray(aluguel.imovel) ? aluguel.imovel[0] : aluguel.imovel
  const inquilino = Array.isArray(aluguel.inquilino) ? aluguel.inquilino[0] : aluguel.inquilino

  if ((imovel as { billing_mode?: string } | null)?.billing_mode !== 'AUTOMATIC') {
    return NextResponse.json({ error: 'Imóvel não configurado para cobrança automática' }, { status: 400 })
  }

  // Load profile for API key
  const { data: profile } = await admin
    .from('profiles')
    .select('asaas_api_key_enc')
    .eq('id', user.id)
    .single()

  if (!profile?.asaas_api_key_enc) {
    return NextResponse.json({ error: 'Conta Asaas não vinculada. Configure em Configurações.' }, { status: 400 })
  }

  const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'
  let apiKey: string
  try {
    apiKey = decryptApiKey(profile.asaas_api_key_enc)
  } catch {
    return NextResponse.json({ error: 'Erro ao acessar credenciais Asaas' }, { status: 500 })
  }

  const headers = {
    'access_token': apiKey,
    'Content-Type': 'application/json',
    'User-Agent': 'ProprietarioZen/1.0',
  }

  // Upsert inquilino as Asaas customer
  const inq = inquilino as {
    id: string; nome: string; cpf: string | null
    email: string | null; telefone: string | null; asaas_customer_id: string | null
  } | null

  let customerId = inq?.asaas_customer_id ?? null

  if (!customerId) {
    if (!inq?.cpf) {
      return NextResponse.json({
        error: 'Inquilino sem CPF — cadastre o CPF para gerar cobrança Asaas'
      }, { status: 400 })
    }

    // Search existing customer by CPF
    const searchRes = await fetch(
      `${baseUrl}/customers?cpfCnpj=${encodeURIComponent(inq.cpf)}`,
      { headers, cache: 'no-store' }
    )
    if (searchRes.ok) {
      const searchData = await searchRes.json() as { data?: { id: string }[] }
      customerId = searchData.data?.[0]?.id ?? null
    }

    if (!customerId) {
      // Create new customer
      const createRes = await fetch(`${baseUrl}/customers`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: inq.nome,
          cpfCnpj: inq.cpf,
          email: inq.email ?? undefined,
          mobilePhone: inq.telefone ?? undefined,
        }),
      })
      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({})) as { errors?: { description: string }[] }
        return NextResponse.json({
          error: err.errors?.[0]?.description ?? 'Erro ao criar cliente no Asaas'
        }, { status: 400 })
      }
      const newCustomer = await createRes.json() as { id: string }
      customerId = newCustomer.id
    }

    // Save customer ID
    if (customerId && inq?.id) {
      await admin.from('inquilinos').update({ asaas_customer_id: customerId }).eq('id', inq.id)
    }
  }

  // Due date: use aluguel date if not past, otherwise today
  const hoje = new Date().toISOString().split('T')[0]
  const dueDate = (aluguel.data_vencimento as string) >= hoje
    ? aluguel.data_vencimento as string
    : hoje

  // Build description
  const [anoRef, mesRef] = (aluguel.mes_referencia as string).split('-')
  const mesNome = new Intl.DateTimeFormat('pt-BR', { month: 'long' })
    .format(new Date(parseInt(anoRef), parseInt(mesRef) - 1, 1))
  const mesLabel = mesNome.charAt(0).toUpperCase() + mesNome.slice(1)
  const description = `Aluguel — ${(imovel as { apelido?: string } | null)?.apelido ?? 'Imóvel'} — ${mesLabel}/${anoRef}`

  // Create charge
  const chargeRes = await fetch(`${baseUrl}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      customer: customerId,
      billingType: 'UNDEFINED',
      value: aluguel.valor,
      dueDate,
      description,
    }),
  })

  if (!chargeRes.ok) {
    const err = await chargeRes.json().catch(() => ({})) as { errors?: { description: string }[] }
    return NextResponse.json({
      error: err.errors?.[0]?.description ?? 'Erro ao criar cobrança no Asaas'
    }, { status: 400 })
  }

  const charge = await chargeRes.json() as { id: string; bankSlipUrl?: string | null }

  // Fetch PIX QR code
  let pixQrcode: string | null = null
  let pixCopiaECola: string | null = null

  const pixRes = await fetch(`${baseUrl}/payments/${charge.id}/pixQrCode`, {
    headers,
    cache: 'no-store',
  })
  if (pixRes.ok) {
    const pixData = await pixRes.json() as { encodedImage?: string; payload?: string }
    pixQrcode = pixData.encodedImage ?? null
    pixCopiaECola = pixData.payload ?? null
  }

  // Persist to alugueis
  const { error: dbErr } = await admin
    .from('alugueis')
    .update({
      asaas_charge_id: charge.id,
      asaas_pix_qrcode: pixQrcode,
      asaas_pix_copiaecola: pixCopiaECola,
      asaas_boleto_url: charge.bankSlipUrl ?? null,
    })
    .eq('id', aluguelId)

  if (dbErr) {
    console.error('[Asaas] CRÍTICO: cobrança criada mas falhou ao salvar:', dbErr.message)
    return NextResponse.json({ error: 'Cobrança criada mas falhou ao salvar no banco' }, { status: 500 })
  }

  return NextResponse.json({
    chargeId: charge.id,
    pixQrcode,
    pixCopiaECola,
    boletoUrl: charge.bankSlipUrl ?? null,
  })
}
