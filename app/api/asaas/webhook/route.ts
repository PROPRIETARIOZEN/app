import { NextResponse, type NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

type AsaasPayment = {
  id: string
  value?: number
  paymentDate?: string
  clientPaymentDate?: string
  billingType?: string
}

type AsaasEvent = {
  event: string
  payment?: AsaasPayment
  account?: { id: string; status: string; walletId?: string }
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('asaas-access-token')
  const expected = process.env.ASAAS_WEBHOOK_TOKEN
  if (!expected || token !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: AsaasEvent
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = createAdminClient()

  switch (body.event) {
    case 'PAYMENT_RECEIVED':
    case 'PAYMENT_CONFIRMED': {
      const payment = body.payment
      if (!payment?.id) break

      const dataPagamento = payment.clientPaymentDate
        ?? payment.paymentDate
        ?? new Date().toISOString().split('T')[0]

      await admin
        .from('alugueis')
        .update({
          status: 'pago',
          data_pagamento: dataPagamento,
          valor_pago: payment.value ?? null,
          metodo_pagamento: payment.billingType ?? null,
        })
        .eq('asaas_charge_id', payment.id)

      revalidatePath('/alugueis')
      revalidatePath('/dashboard')
      break
    }

    case 'PAYMENT_OVERDUE': {
      const payment = body.payment
      if (!payment?.id) break

      await admin
        .from('alugueis')
        .update({ status: 'atrasado' })
        .eq('asaas_charge_id', payment.id)
        .eq('status', 'pendente')

      revalidatePath('/alugueis')
      revalidatePath('/dashboard')
      break
    }

    case 'PAYMENT_DELETED':
    case 'PAYMENT_REFUNDED': {
      const payment = body.payment
      if (!payment?.id) break

      const newStatus = body.event === 'PAYMENT_REFUNDED' ? 'estornado' : 'cancelado'

      await admin
        .from('alugueis')
        .update({
          status: newStatus,
          asaas_charge_id: null,
          asaas_pix_qrcode: null,
          asaas_pix_copiaecola: null,
          asaas_boleto_url: null,
        })
        .eq('asaas_charge_id', payment.id)

      revalidatePath('/alugueis')
      revalidatePath('/dashboard')
      break
    }

    case 'ACCOUNT_STATUS_UPDATED': {
      const account = body.account
      if (!account?.id) break

      await admin
        .from('profiles')
        .update({ asaas_account_status: account.status })
        .or(`asaas_account_id.eq.${account.id}${account.walletId ? `,asaas_wallet_id.eq.${account.walletId}` : ''}`)

      break
    }

    default:
      // Unknown event — acknowledge without processing
      break
  }

  return NextResponse.json({ received: true })
}
