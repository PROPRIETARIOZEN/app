import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import { getStripe } from '@/lib/stripe'
import { getAppUrl } from '@/lib/app-url'

export const dynamic = 'force-dynamic'

// POST /api/checkout
// Cria uma sessão de Stripe Checkout para o plano Pro.
export async function POST() {
  // ── Verificação de variáveis de ambiente ──────────────────────────────────
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[checkout] STRIPE_SECRET_KEY não configurada')
    return NextResponse.json({ error: 'Pagamento não configurado: STRIPE_SECRET_KEY ausente' }, { status: 500 })
  }
  if (!process.env.STRIPE_PRICE_ID) {
    console.error('[checkout] STRIPE_PRICE_ID não configurada')
    return NextResponse.json({ error: 'Pagamento não configurado: STRIPE_PRICE_ID ausente' }, { status: 500 })
  }

  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const admin = createAdminClient()
    const { data: profile, error: profileError } = await admin
      .from('profiles')
      .select('nome, email, stripe_customer_id, plano')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('[checkout] Erro ao buscar perfil:', profileError.message)
      return NextResponse.json({ error: `Erro ao buscar perfil: ${profileError.message}` }, { status: 500 })
    }
    if (!profile) return NextResponse.json({ error: 'Perfil não encontrado' }, { status: 404 })
    if (profile.plano === 'pago') {
      return NextResponse.json({ error: 'Você já possui o plano Pro' }, { status: 400 })
    }

    const appUrl = getAppUrl()
    const stripe = getStripe()

    // Cria ou reutiliza o customer da Stripe
    let customerId = profile.stripe_customer_id

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.nome,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      await admin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${appUrl}/sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/cancelado`,
      locale: 'pt-BR',
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[checkout] Erro:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
