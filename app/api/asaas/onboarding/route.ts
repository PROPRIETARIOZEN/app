import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// ── Criptografia da apiKey (AES-256-GCM) ──────────────────────────────────────

const CIPHER = 'aes-256-gcm'
const IV_LEN = 16

function encryptionKey(): Buffer {
  const hex = process.env.ASAAS_ENCRYPTION_KEY ?? ''
  if (hex.length !== 64) throw new Error('ASAAS_ENCRYPTION_KEY deve ter 64 caracteres hex.')
  return Buffer.from(hex, 'hex')
}

function encryptApiKey(plain: string): string {
  const key = encryptionKey()
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(CIPHER, key, iv)
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return [iv.toString('hex'), tag.toString('hex'), encrypted.toString('hex')].join(':')
}

// ── POST /api/asaas/onboarding ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()

  // 1. Verificar se já tem subconta
  const { data: profile } = await admin
    .from('profiles')
    .select('asaas_account_id, asaas_account_status')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.asaas_account_id) {
    return NextResponse.json(
      { error: 'Você já possui uma conta Asaas vinculada.', accountStatus: profile.asaas_account_status },
      { status: 409 },
    )
  }

  // 2. Validação dos campos obrigatórios
  const body = await req.json()
  const required = ['name', 'email', 'cpfCnpj', 'mobilePhone', 'address', 'addressNumber', 'province', 'postalCode']
  const missing = required.filter(f => !body[f])
  if (missing.length > 0) {
    return NextResponse.json({ error: `Campos obrigatórios ausentes: ${missing.join(', ')}` }, { status: 422 })
  }

  const apiKey = process.env.ASAAS_API_KEY_ROOT
  const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'
  if (!apiKey) return NextResponse.json({ error: 'Integração Asaas não configurada.' }, { status: 503 })

  // 3. Criar subconta no Asaas
  let asaasRes: Response
  try {
    asaasRes = await fetch(`${baseUrl}/accounts`, {
      method: 'POST',
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json',
        'User-Agent': 'ProprietarioZen/1.0',
      },
      body: JSON.stringify({
        name:          body.name,
        email:         body.email,
        cpfCnpj:       body.cpfCnpj,
        birthDate:     body.birthDate ?? undefined,
        phone:         body.phone ?? undefined,
        mobilePhone:   body.mobilePhone,
        address:       body.address,
        addressNumber: body.addressNumber,
        province:      body.province,
        postalCode:    body.postalCode,
        companyType:   body.companyType ?? undefined,
      }),
    })
  } catch (err) {
    console.error('[Asaas] Falha de rede ao criar subconta:', err)
    return NextResponse.json({ error: 'Falha de comunicação com o Asaas. Tente novamente.' }, { status: 502 })
  }

  if (!asaasRes.ok) {
    const errBody = await asaasRes.json().catch(() => ({}))
    const msg = (errBody as { errors?: { description: string }[] }).errors?.[0]?.description
      ?? 'Erro ao criar conta no Asaas.'
    return NextResponse.json({ error: msg }, { status: asaasRes.status })
  }

  const { id: asaasId, apiKey: rawApiKey, walletId } = await asaasRes.json() as {
    id: string; apiKey: string; walletId?: string
  }

  if (!asaasId || !rawApiKey) {
    return NextResponse.json({ error: 'Resposta inesperada do Asaas.' }, { status: 500 })
  }

  // 4. Criptografar e persistir
  let encryptedKey: string
  try {
    encryptedKey = encryptApiKey(rawApiKey)
  } catch (err) {
    console.error('[Asaas] Falha ao criptografar apiKey:', err)
    return NextResponse.json({ error: 'Erro interno ao salvar credenciais.' }, { status: 500 })
  }

  const { error: dbErr } = await admin
    .from('profiles')
    .update({
      asaas_account_id:     asaasId,
      asaas_api_key_enc:    encryptedKey,
      asaas_wallet_id:      walletId ?? null,
      asaas_account_status: 'PENDING',
    })
    .eq('id', user.id)

  if (dbErr) {
    console.error(`[Asaas] CRÍTICO: subconta criada (${asaasId}) mas falhou ao salvar no banco:`, dbErr.message)
    return NextResponse.json(
      { error: 'Conta criada no Asaas mas falhou ao salvar no banco. Contate o suporte.' },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      message: 'Conta criada! Verifique seu e-mail para definir a senha e enviar os documentos no painel Asaas.',
      asaasId,
      accountStatus: 'PENDING',
    },
    { status: 201 },
  )
}
