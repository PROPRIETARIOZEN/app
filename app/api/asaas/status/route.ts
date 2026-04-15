import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

// ── Descriptografia da apiKey (AES-256-GCM) ───────────────────────────────────

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

// ── GET /api/asaas/status ─────────────────────────────────────────────────────
export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('asaas_account_id, asaas_api_key_enc, asaas_account_status, asaas_wallet_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.asaas_account_id) {
    return NextResponse.json({ error: 'Nenhuma conta Asaas vinculada.' }, { status: 404 })
  }

  const baseUrl = process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3'

  try {
    const decryptedKey = decryptApiKey(profile.asaas_api_key_enc!)
    const res = await fetch(`${baseUrl}/myAccount/status`, {
      headers: {
        'access_token': decryptedKey,
        'User-Agent': 'ProprietarioZen/1.0',
      },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Falha ao consultar status no Asaas.' }, { status: res.status })
    }

    const { commercialInfoStatus, accountStatus } = await res.json() as {
      commercialInfoStatus: string; accountStatus: string
    }

    // Atualiza status no banco se mudou
    if (accountStatus && profile.asaas_account_status !== accountStatus) {
      await admin.from('profiles').update({ asaas_account_status: accountStatus }).eq('id', user.id)
    }

    return NextResponse.json({ commercialInfoStatus, accountStatus, asaasId: profile.asaas_account_id })
  } catch (err) {
    console.error('[Asaas] Erro ao consultar status:', err)
    return NextResponse.json({ error: 'Erro interno ao consultar status.' }, { status: 500 })
  }
}
