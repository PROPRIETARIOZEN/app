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

  // Load aluguel (ownership check via imovel.user_id)
  const { data: aluguel } = await admin
    .from('alugueis')
    .select('id, asaas_charge_id, imovel:imoveis!inner(user_id)')
    .eq('id', aluguelId)
    .eq('imovel.user_id', user.id)
    .single()

  if (!aluguel) return NextResponse.json({ error: 'Aluguel não encontrado' }, { status: 404 })
  if (!aluguel.asaas_charge_id) {
    return NextResponse.json({ error: 'Sem cobrança Asaas vinculada' }, { status: 400 })
  }

  // Load profile for API key
  const { data: profile } = await admin
    .from('profiles')
    .select('asaas_api_key_enc')
    .eq('id', user.id)
    .single()

  if (!profile?.asaas_api_key_enc) {
    return NextResponse.json({ error: 'Conta Asaas não configurada' }, { status: 400 })
  }

  const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'
  let apiKey: string
  try {
    apiKey = decryptApiKey(profile.asaas_api_key_enc)
  } catch {
    return NextResponse.json({ error: 'Erro ao acessar credenciais Asaas' }, { status: 500 })
  }

  // Cancel charge in Asaas (404 = already gone, treat as OK)
  const cancelRes = await fetch(`${baseUrl}/payments/${aluguel.asaas_charge_id}`, {
    method: 'DELETE',
    headers: {
      'access_token': apiKey,
      'User-Agent': 'ProprietarioZen/1.0',
    },
  })

  if (!cancelRes.ok && cancelRes.status !== 404) {
    const err = await cancelRes.json().catch(() => ({})) as { errors?: { description: string }[] }
    return NextResponse.json({
      error: err.errors?.[0]?.description ?? 'Erro ao cancelar cobrança no Asaas'
    }, { status: 400 })
  }

  // Clear Asaas fields in DB
  const { error: dbErr } = await admin
    .from('alugueis')
    .update({
      asaas_charge_id: null,
      asaas_pix_qrcode: null,
      asaas_pix_copiaecola: null,
      asaas_boleto_url: null,
    })
    .eq('id', aluguelId)

  if (dbErr) {
    return NextResponse.json({ error: 'Cobrança cancelada mas falhou ao atualizar banco' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
