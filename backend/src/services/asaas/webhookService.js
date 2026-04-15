'use strict'

require('dotenv').config()
const { createClient } = require('./asaasClient')
const { AsaasIntegrationError } = require('./AsaasIntegrationError')
const supabase = require('../../lib/supabase')

// ── Configuração de webhooks ──────────────────────────────────────────────────

const WEBHOOK_EVENTS = [
  'PAYMENT_RECEIVED',
  'PAYMENT_OVERDUE',
  'PAYMENT_DELETED',
  'ACCOUNT_STATUS_UPDATED',
]

/**
 * Registra os webhooks necessários na subconta do proprietário.
 * Idempotente: se o webhook já existir (409), considera sucesso silencioso.
 *
 * @param {string} asaasId          ID da subconta no Asaas
 * @param {string} decryptedApiKey  apiKey da subconta já descriptografada
 * @returns {Promise<void>}
 */
async function setupWebhook(asaasId, decryptedApiKey) {
  const webhookUrl = `${process.env.WEBHOOK_BASE_URL}/api/webhooks/asaas`

  if (!process.env.WEBHOOK_BASE_URL) {
    console.warn(
      '[Asaas] WEBHOOK_BASE_URL não configurada. ' +
      'Webhook não será registrado. Use ngrok em desenvolvimento.',
    )
    return
  }

  const subClient = createClient(decryptedApiKey)

  const payload = {
    url:          webhookUrl,
    email:        null,
    enabled:      true,
    interrupted:  false,
    sendType:     'SEQUENTIALLY',
    events:       WEBHOOK_EVENTS,
    authToken:    process.env.ASAAS_WEBHOOK_TOKEN,
  }

  try {
    await subClient.post('/webhook', payload)
    console.info(`[Asaas] Webhook registrado para subconta ${asaasId}`)
  } catch (error) {
    if (error.asaasCode === 'webhookAlreadyExists' || error.statusCode === 409) {
      console.info(`[Asaas] Webhook já existente para subconta ${asaasId} — nenhuma ação necessária.`)
      return
    }
    console.error(`[Asaas] Falha ao registrar webhook para subconta ${asaasId}:`, error.message)
    throw error
  }
}

// ── Push notifications ────────────────────────────────────────────────────────

async function sendPushNotification(userId, title, body, data = {}) {
  try {
    const admin = require('firebase-admin')

    const { data: profile } = await supabase
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .maybeSingle()

    if (!profile?.fcm_token) {
      console.debug(`[Firebase] Usuário ${userId} sem FCM token. Notificação não enviada.`)
      return
    }

    await admin.messaging().send({
      token: profile.fcm_token,
      notification: { title, body },
      data: { ...data, userId: String(userId) },
      android: {
        priority: 'high',
        notification: { channelId: 'pagamentos' },
      },
      apns: {
        payload: { aps: { sound: 'default', badge: 1 } },
      },
    })
  } catch (err) {
    console.error('[Firebase] Falha ao enviar notificação push:', err.message)
  }
}

// ── Event handlers ────────────────────────────────────────────────────────────

async function handleAccountStatusUpdated(event) {
  const { account } = event
  if (!account?.id) {
    console.warn('[Asaas Webhook] ACCOUNT_STATUS_UPDATED sem account.id')
    return
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, asaas_account_status')
    .eq('asaas_account_id', account.id)
    .maybeSingle()

  if (!profile) {
    console.warn(`[Asaas Webhook] ACCOUNT_STATUS_UPDATED: subconta ${account.id} não encontrada.`)
    return
  }

  const newStatus      = account.accountStatus ?? account.status
  const previousStatus = profile.asaas_account_status

  await supabase
    .from('profiles')
    .update({ asaas_account_status: newStatus })
    .eq('id', profile.id)

  console.info(`[Asaas Webhook] Conta ${account.id}: ${previousStatus} → ${newStatus}`)

  if (newStatus === 'ACTIVE' && previousStatus !== 'ACTIVE') {
    await sendPushNotification(
      profile.id,
      '🎉 Conta aprovada!',
      'Sua conta foi aprovada. Agora você já pode receber aluguéis diretamente.',
      { type: 'ACCOUNT_APPROVED', asaasId: account.id },
    )
  } else if (newStatus === 'REJECTED') {
    await sendPushNotification(
      profile.id,
      'Conta não aprovada',
      'Sua conta Asaas não foi aprovada. Entre em contato com o suporte para mais informações.',
      { type: 'ACCOUNT_REJECTED', asaasId: account.id },
    )
  } else if (newStatus === 'BLOCKED') {
    await sendPushNotification(
      profile.id,
      'Conta bloqueada',
      'Sua conta Asaas foi bloqueada temporariamente. Acesse o painel Asaas para mais detalhes.',
      { type: 'ACCOUNT_BLOCKED', asaasId: account.id },
    )
  }
}

async function handlePaymentReceived(event) {
  const { payment } = event
  if (!payment?.id) {
    console.warn('[Asaas Webhook] PAYMENT_RECEIVED sem payment.id')
    return
  }

  // Localiza o proprietário via asaas_account_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .or(`asaas_account_id.eq.${payment.asaasAccount},asaas_wallet_id.eq.${payment.transferredBy?.walletId}`)
    .maybeSingle()

  if (!profile) {
    console.warn(`[Asaas Webhook] PAYMENT_RECEIVED: proprietário não identificado. payment.id=${payment.id}`)
    return
  }

  console.info(`[Asaas Webhook] Pagamento ${payment.id} recebido. Valor: R$ ${payment.value} | Tipo: ${payment.billingType}`)

  // Atualiza o aluguel correspondente
  await supabase
    .from('alugueis')
    .update({
      status:          'pago',
      data_pagamento:  payment.paymentDate ?? new Date().toISOString().slice(0, 10),
      valor_pago:      payment.value,
      metodo_pagamento: payment.billingType,
    })
    .eq('asaas_charge_id', payment.id)

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(payment.value)

  await sendPushNotification(
    profile.id,
    '💸 Aluguel recebido!',
    `Pagamento de ${valorFormatado} confirmado via ${payment.billingType === 'PIX' ? 'Pix' : 'Boleto'}.`,
    { type: 'PAYMENT_RECEIVED', chargeId: payment.id, value: String(payment.value) },
  )
}

async function handlePaymentOverdue(event) {
  const { payment } = event
  if (!payment?.id) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .or(`asaas_account_id.eq.${payment.asaasAccount},asaas_wallet_id.eq.${payment.transferredBy?.walletId}`)
    .maybeSingle()

  if (!profile) return

  await supabase
    .from('alugueis')
    .update({ status: 'atrasado' })
    .eq('asaas_charge_id', payment.id)

  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style:    'currency',
    currency: 'BRL',
  }).format(payment.value)

  console.info(`[Asaas Webhook] Pagamento vencido: ${payment.id} | Valor: R$ ${payment.value}`)

  await sendPushNotification(
    profile.id,
    '⚠️ Aluguel em atraso',
    `Cobrança de ${valorFormatado} venceu sem pagamento. Considere notificar o inquilino.`,
    { type: 'PAYMENT_OVERDUE', chargeId: payment.id, value: String(payment.value) },
  )
}

async function handlePaymentDeleted(event) {
  const { payment } = event
  if (!payment?.id) return

  console.info(`[Asaas Webhook] Cobrança ${payment.id} cancelada/excluída.`)

  await supabase
    .from('alugueis')
    .update({ status: 'cancelado' })
    .eq('asaas_charge_id', payment.id)
}

/**
 * Handler principal do webhook.
 * Sempre resolve (nunca rejeita) para garantir HTTP 200 ao Asaas.
 */
async function handleWebhookEvent(event) {
  const { event: eventType } = event
  console.info(`[Asaas Webhook] Evento recebido: ${eventType}`)

  try {
    switch (eventType) {
      case 'ACCOUNT_STATUS_UPDATED':
        await handleAccountStatusUpdated(event)
        break
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        await handlePaymentReceived(event)
        break
      case 'PAYMENT_OVERDUE':
        await handlePaymentOverdue(event)
        break
      case 'PAYMENT_DELETED':
        await handlePaymentDeleted(event)
        break
      default:
        console.debug(`[Asaas Webhook] Evento ignorado: ${eventType}`)
    }
  } catch (err) {
    console.error(`[Asaas Webhook] Erro ao processar ${eventType}:`, err.message)
  }
}

module.exports = {
  setupWebhook,
  handleWebhookEvent,
  handleAccountStatusUpdated,
  handlePaymentReceived,
  handlePaymentOverdue,
  handlePaymentDeleted,
  sendPushNotification,
}
