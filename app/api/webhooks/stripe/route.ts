import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'
import type Stripe from 'stripe'

// Desabilita o body parsing automático do Next.js para verificar a assinatura do Stripe
export const dynamic = 'force-dynamic'

async function atualizarPlanoUsuario(customerId: string, plano: 'gratis' | 'pago') {
  const admin = createAdminClient()
  const { data: profile, error } = await admin
    .from('profiles')
    .update({ plano })
    .eq('stripe_customer_id', customerId)
    .select('id')
    .single()

  if (error) console.error('[webhook] Erro ao atualizar plano:', error.message)
  return profile?.id ?? null
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    )
  } catch (err) {
    console.error('[webhook] Assinatura inválida:', err)
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  const customerId =
    typeof (event.data.object as { customer?: string }).customer === 'string'
      ? (event.data.object as { customer: string }).customer
      : null

  if (!customerId) {
    return NextResponse.json({ received: true })
  }

  switch (event.type) {
    // Assinatura criada ou reativada → plano Pro
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.status === 'active' || sub.status === 'trialing') {
        const uid = await atualizarPlanoUsuario(customerId, 'pago')
        if (uid) await registrarLog(uid, 'UPGRADE_PRO', 'subscription', sub.id)
      } else if (sub.status === 'canceled' || sub.status === 'unpaid') {
        const uid = await atualizarPlanoUsuario(customerId, 'gratis')
        if (uid) await registrarLog(uid, 'CANCELAMENTO', 'subscription', sub.id)
      }
      break
    }

    // Assinatura cancelada / expirada → plano Grátis
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const uid = await atualizarPlanoUsuario(customerId, 'gratis')
      if (uid) await registrarLog(uid, 'CANCELAMENTO', 'subscription', sub.id)
      break
    }

    // Checkout concluído com sucesso
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      if (session.mode === 'subscription' && session.payment_status === 'paid') {
        const uid = await atualizarPlanoUsuario(customerId, 'pago')
        if (uid) await registrarLog(uid, 'UPGRADE_PRO', 'checkout', session.id)
      }
      break
    }

    default:
      // Evento ignorado — responde 200 para o Stripe não reenviar
      break
  }

  return NextResponse.json({ received: true })
}
