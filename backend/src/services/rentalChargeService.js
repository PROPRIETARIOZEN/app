'use strict'

const supabase = require('../lib/supabase')
const {
  upsertCustomer,
  createCharge,
  getCharge,
  cancelCharge,
  getPixQrCode,
  createSubscription,
} = require('./asaas/chargeService')
const { sendChargeCreatedEmail } = require('./emailService')

// ── Helpers ───────────────────────────────────────────────────────────────────

function notFound(msg) {
  const err = new Error(msg)
  err.statusCode = 404
  return err
}

function conflict(msg) {
  const err = new Error(msg)
  err.statusCode = 409
  return err
}

/**
 * Converte YYYY-MM em uma data PostgreSQL (primeiro dia do mês: YYYY-MM-01).
 * A coluna mes_referencia é do tipo date e armazena sempre o dia 1.
 */
function referenceMonthToDate(referenceMonth) {
  return `${referenceMonth}-01`
}

/**
 * Converte a data PostgreSQL mes_referencia de volta para YYYY-MM.
 */
function dateToReferenceMonth(dateStr) {
  return String(dateStr).substring(0, 7)
}

// ── Mapeamento de status ──────────────────────────────────────────────────────

const ASAAS_STATUS_MAP = {
  PENDING:          'pendente',
  CONFIRMED:        'pago',
  RECEIVED:         'pago',
  OVERDUE:          'atrasado',
  REFUNDED:         'estornado',
  REFUND_REQUESTED: 'estornado',
  CANCELLED:        'cancelado',
  DELETED:          'cancelado',
}

// ─────────────────────────────────────────────────────────────────────────────
// createOrGetCustomer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Garante que o inquilino existe como customer na subconta Asaas do proprietário.
 * O asaas_customer_id é cacheado em inquilinos.asaas_customer_id.
 *
 * @param {Object} imovel     Linha de imoveis (contém user_id = landlordId)
 * @param {Object} inquilino  Linha de inquilinos
 * @returns {Promise<string>} asaasCustomerId
 */
async function createOrGetCustomer(imovel, inquilino) {
  if (inquilino.asaas_customer_id) return inquilino.asaas_customer_id

  const customer = await upsertCustomer(imovel.user_id, {
    name: inquilino.nome,
    cpfCnpj: inquilino.cpf,
    email: inquilino.email,
    mobilePhone: inquilino.telefone,
    ...(inquilino.telefone_fixo ? { phone: inquilino.telefone_fixo } : {}),
  })

  await supabase
    .from('inquilinos')
    .update({ asaas_customer_id: customer.id })
    .eq('id', inquilino.id)

  return customer.id
}

// ─────────────────────────────────────────────────────────────────────────────
// createMonthlyCharge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria uma cobrança avulsa para um mês específico de aluguel.
 * Idempotente: retorna a linha existente se já houver uma para o mesmo imovel+mês.
 *
 * @param {Object} imovel         Linha de imoveis
 * @param {Object} inquilino      Linha de inquilinos
 * @param {string} referenceMonth Formato YYYY-MM
 * @returns {Promise<Object>}     Linha de alugueis
 */
async function createMonthlyCharge(imovel, inquilino, referenceMonth) {
  const mesReferencia = referenceMonthToDate(referenceMonth)

  // Idempotência via índice único (imovel_id, mes_referencia)
  const { data: existing } = await supabase
    .from('alugueis')
    .select('*')
    .eq('imovel_id', imovel.id)
    .eq('mes_referencia', mesReferencia)
    .maybeSingle()

  if (existing) return existing

  const asaasCustomerId = await createOrGetCustomer(imovel, inquilino)

  const [year, month] = referenceMonth.split('-').map(Number)
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
  const dueDate = `${referenceMonth}-${String(imovel.dia_vencimento).padStart(2, '0')}`

  const chargePayload = {
    customer: asaasCustomerId,
    billingType: 'UNDEFINED',
    value: imovel.valor_aluguel,
    dueDate,
    description: `Aluguel referente a ${monthName} — ${imovel.endereco}`,
    externalReference: `${imovel.id}-${referenceMonth}`,
    fine: { value: imovel.multa_percentual ?? 2 },
    interest: { value: imovel.juros_percentual ?? 1 },
    ...(imovel.desconto_percentual > 0
      ? { discount: { value: imovel.desconto_percentual, type: 'PERCENTAGE', dueDateLimitDays: 0 } }
      : {}),
  }

  const asaasCharge = await createCharge(imovel.user_id, chargePayload)

  const { data: aluguel, error } = await supabase
    .from('alugueis')
    .insert({
      imovel_id:          imovel.id,
      inquilino_id:       inquilino.id,
      mes_referencia:     mesReferencia,
      valor:              imovel.valor_aluguel,
      data_vencimento:    dueDate,
      status:             'pendente',
      asaas_charge_id:    asaasCharge.id,
      asaas_customer_id:  asaasCustomerId,
      asaas_boleto_url:   asaasCharge.invoiceUrl ?? null,
    })
    .select()
    .single()

  if (error) throw error

  // E-mail de notificação — falha não bloqueia a resposta
  sendChargeCreatedEmail({
    tenantName:     inquilino.nome,
    tenantEmail:    inquilino.email,
    amount:         imovel.valor_aluguel,
    dueDate:        new Date(`${dueDate}T12:00:00`),
    invoiceUrl:     asaasCharge.invoiceUrl ?? '',
    referenceMonth,
  }).catch(err => console.error('[Email] Falha ao enviar cobrança:', err.message))

  return aluguel
}

// ─────────────────────────────────────────────────────────────────────────────
// createRecurringCharge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria uma assinatura recorrente no Asaas (billing_mode=AUTOMATIC).
 * Se já existir, retorna o ID existente sem criar duplicata.
 *
 * @param {Object} imovel     Linha de imoveis
 * @param {Object} inquilino  Linha de inquilinos
 * @returns {Promise<string>} asaasSubscriptionId
 */
async function createRecurringCharge(imovel, inquilino) {
  if (imovel.asaas_subscription_id) return imovel.asaas_subscription_id

  const asaasCustomerId = await createOrGetCustomer(imovel, inquilino)

  const now = new Date()
  let nextYear  = now.getFullYear()
  let nextMonth = now.getMonth() + 1
  if (now.getDate() > imovel.dia_vencimento) {
    nextMonth++
    if (nextMonth > 12) { nextMonth = 1; nextYear++ }
  }
  const nextDueDate =
    `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(imovel.dia_vencimento).padStart(2, '0')}`

  const subscription = await createSubscription(imovel.user_id, {
    customer:          asaasCustomerId,
    value:             imovel.valor_aluguel,
    nextDueDate,
    description:       `Aluguel mensal — ${imovel.endereco}`,
    externalReference: imovel.id,
    fine:              { value: imovel.multa_percentual ?? 2 },
    interest:          { value: imovel.juros_percentual ?? 1 },
    ...(imovel.desconto_percentual > 0
      ? { discount: { value: imovel.desconto_percentual, type: 'PERCENTAGE', dueDateLimitDays: 0 } }
      : {}),
  })

  await supabase
    .from('imoveis')
    .update({ asaas_subscription_id: subscription.id })
    .eq('id', imovel.id)

  return subscription.id
}

// ─────────────────────────────────────────────────────────────────────────────
// getChargeStatus
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sincroniza o status de uma cobrança com o Asaas e atualiza o banco se mudou.
 *
 * @param {string} landlordId   user_id do proprietário
 * @param {string} aluguelId    id da linha em alugueis
 * @returns {Promise<Object>}   Linha de alugueis atualizada
 */
async function getChargeStatus(landlordId, aluguelId) {
  // Busca e verifica propriedade via join
  const { data: aluguel } = await supabase
    .from('alugueis')
    .select('*, imoveis!inner(user_id)')
    .eq('id', aluguelId)
    .eq('imoveis.user_id', landlordId)
    .maybeSingle()

  if (!aluguel) throw notFound('Cobrança não encontrada.')

  const asaasCharge = await getCharge(landlordId, aluguel.asaas_charge_id)
  const newStatus   = ASAAS_STATUS_MAP[asaasCharge.status] ?? aluguel.status

  if (newStatus !== aluguel.status || asaasCharge.paymentDate) {
    const updates = { status: newStatus }

    if (asaasCharge.paymentDate) {
      updates.data_pagamento    = asaasCharge.paymentDate
      updates.valor_pago        = asaasCharge.value
      updates.metodo_pagamento  = asaasCharge.billingType ?? null
    }

    const { data: updated, error } = await supabase
      .from('alugueis')
      .update(updates)
      .eq('id', aluguelId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  return aluguel
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelRentalCharge
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cancela uma cobrança no Asaas e marca como cancelado no banco.
 * Lança erro 409 se a cobrança já foi paga.
 *
 * @param {string} landlordId   user_id do proprietário
 * @param {string} aluguelId    id da linha em alugueis
 * @returns {Promise<Object>}   Linha de alugueis atualizada
 */
async function cancelRentalCharge(landlordId, aluguelId) {
  const { data: aluguel } = await supabase
    .from('alugueis')
    .select('*, imoveis!inner(user_id)')
    .eq('id', aluguelId)
    .eq('imoveis.user_id', landlordId)
    .maybeSingle()

  if (!aluguel) throw notFound('Cobrança não encontrada.')
  if (aluguel.status === 'pago') throw conflict('Não é possível cancelar uma cobrança já paga.')

  if (aluguel.status !== 'cancelado') {
    await cancelCharge(landlordId, aluguel.asaas_charge_id)

    const { data: updated, error } = await supabase
      .from('alugueis')
      .update({ status: 'cancelado' })
      .eq('id', aluguelId)
      .select()
      .single()

    if (error) throw error
    return updated
  }

  return aluguel
}

// ─────────────────────────────────────────────────────────────────────────────
// generatePixQrCode
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o QR Code Pix de uma cobrança.
 * O payload é cacheado em alugueis.asaas_pix_qrcode após a primeira consulta.
 *
 * @param {string} landlordId   user_id do proprietário
 * @param {string} aluguelId    id da linha em alugueis
 * @returns {Promise<{ encodedImage: string|null, payload: string }>}
 */
async function generatePixQrCode(landlordId, aluguelId) {
  const { data: aluguel } = await supabase
    .from('alugueis')
    .select('*, imoveis!inner(user_id)')
    .eq('id', aluguelId)
    .eq('imoveis.user_id', landlordId)
    .maybeSingle()

  if (!aluguel) throw notFound('Cobrança não encontrada.')

  if (aluguel.asaas_pix_qrcode) {
    return { encodedImage: null, payload: aluguel.asaas_pix_qrcode }
  }

  const qrData = await getPixQrCode(landlordId, aluguel.asaas_charge_id)

  if (qrData.payload) {
    await supabase
      .from('alugueis')
      .update({
        asaas_pix_qrcode:     qrData.payload,
        asaas_pix_copiaecola: qrData.payload,
      })
      .eq('id', aluguelId)
  }

  return qrData
}

module.exports = {
  createOrGetCustomer,
  createMonthlyCharge,
  createRecurringCharge,
  getChargeStatus,
  cancelRentalCharge,
  generatePixQrCode,
}
