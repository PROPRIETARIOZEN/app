import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// POST /api/portal
// Cria uma sessão do Stripe Billing Portal para gerenciar/cancelar assinatura.
export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada' }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proprietariozen.com.br'
    const stripe = getStripe()

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${appUrl}/configuracoes#assinatura`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[POST /api/portal]', err)
    return NextResponse.json({ error: 'Erro ao abrir portal de assinatura' }, { status: 500 })
  }
}
