'use strict'

process.env.SUPABASE_URL              = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
process.env.ASAAS_API_KEY_ROOT        = 'test_root_key'
process.env.ASAAS_ENCRYPTION_KEY      = 'a'.repeat(64)
process.env.NODE_ENV                  = 'test'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../../src/lib/supabase')
jest.mock('../../src/services/asaas/chargeService')
jest.mock('../../src/services/emailService')

const supabase      = require('../../src/lib/supabase')
const chargeService = require('../../src/services/asaas/chargeService')
const emailService  = require('../../src/services/emailService')

const {
  createOrGetCustomer,
  createMonthlyCharge,
  createRecurringCharge,
  getChargeStatus,
  cancelRentalCharge,
  generatePixQrCode,
} = require('../../src/services/rentalChargeService')

// ── Chain builder ─────────────────────────────────────────────────────────────
//
// All supabase.from() calls return a shared chain whose terminal methods
// (maybeSingle / single) are reset per-test and queued with mockResolvedValueOnce.

let chain

beforeEach(() => {
  jest.clearAllMocks()
  emailService.sendChargeCreatedEmail.mockResolvedValue(undefined)

  chain = {
    select:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    update:      jest.fn().mockReturnThis(),
    insert:      jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    single:      jest.fn(),
  }

  supabase.from = jest.fn().mockReturnValue(chain)
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const LANDLORD_ID = 'lnd-uuid-1'
const IMOVEL_ID   = 'im-uuid-1'
const INQUILINO_ID = 'inq-uuid-1'
const ALUGUEL_ID  = 'al-uuid-1'

const mockImovel = {
  id:                  IMOVEL_ID,
  user_id:             LANDLORD_ID,
  endereco:            'Rua das Flores, 42 — Apto 3B',
  valor_aluguel:       1500,
  dia_vencimento:      10,
  multa_percentual:    2,
  juros_percentual:    1,
  desconto_percentual: 0,
  asaas_subscription_id: null,
}

const mockInquilino = {
  id:                 INQUILINO_ID,
  user_id:            LANDLORD_ID,
  imovel_id:          IMOVEL_ID,
  nome:               'João da Silva',
  email:              'joao@example.com',
  cpf:                '12345678901',
  telefone:           '11999999999',
  asaas_customer_id:  null,
}

const mockAsaasCharge = {
  id:         'pay_abc123',
  invoiceUrl: 'https://asaas.com/i/abc123',
  status:     'PENDING',
}

const mockAluguel = {
  id:               ALUGUEL_ID,
  imovel_id:        IMOVEL_ID,
  inquilino_id:     INQUILINO_ID,
  asaas_charge_id:  'pay_abc123',
  asaas_customer_id: 'cus_xyz',
  valor:            1500,
  data_vencimento:  '2026-05-10',
  mes_referencia:   '2026-05-01',
  status:           'pendente',
  asaas_pix_qrcode: null,
}

// ─────────────────────────────────────────────────────────────────────────────
// createOrGetCustomer
// ─────────────────────────────────────────────────────────────────────────────

describe('createOrGetCustomer', () => {
  it('retorna o ID cacheado sem chamar o Asaas', async () => {
    const inquilinoComCache = { ...mockInquilino, asaas_customer_id: 'cus_cached' }

    const result = await createOrGetCustomer(mockImovel, inquilinoComCache)

    expect(result).toBe('cus_cached')
    expect(chargeService.upsertCustomer).not.toHaveBeenCalled()
  })

  it('chama upsertCustomer e persiste o ID quando não há cache', async () => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_new' })

    const result = await createOrGetCustomer(mockImovel, mockInquilino)

    expect(chargeService.upsertCustomer).toHaveBeenCalledWith(
      LANDLORD_ID,
      expect.objectContaining({ cpfCnpj: mockInquilino.cpf })
    )
    expect(supabase.from).toHaveBeenCalledWith('inquilinos')
    expect(result).toBe('cus_new')
  })

  it('não inclui phone se telefone_fixo for undefined', async () => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_new' })

    await createOrGetCustomer(mockImovel, { ...mockInquilino, telefone_fixo: undefined })

    const callArg = chargeService.upsertCustomer.mock.calls[0][1]
    expect(callArg).not.toHaveProperty('phone')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createMonthlyCharge
// ─────────────────────────────────────────────────────────────────────────────

describe('createMonthlyCharge', () => {
  beforeEach(() => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_xyz' })
    chargeService.createCharge.mockResolvedValue(mockAsaasCharge)
  })

  it('retorna cobrança existente sem criar nova (idempotência)', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: mockAluguel })

    const result = await createMonthlyCharge(mockImovel, mockInquilino, '2026-05')

    expect(result).toBe(mockAluguel)
    expect(chargeService.createCharge).not.toHaveBeenCalled()
  })

  it('cria cobrança no Asaas e salva no banco', async () => {
    // 1ª maybeSingle: não há cobrança existente
    chain.maybeSingle.mockResolvedValueOnce({ data: null })
    // single: retorno após insert
    chain.single.mockResolvedValueOnce({ data: mockAluguel, error: null })

    const result = await createMonthlyCharge(mockImovel, mockInquilino, '2026-05')

    expect(chargeService.createCharge).toHaveBeenCalledWith(
      LANDLORD_ID,
      expect.objectContaining({
        customer:    'cus_xyz',
        billingType: 'UNDEFINED',
        value:       1500,
        dueDate:     '2026-05-10',
      })
    )
    expect(supabase.from).toHaveBeenCalledWith('alugueis')
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        mes_referencia:  '2026-05-01',
        asaas_charge_id: 'pay_abc123',
        status:          'pendente',
      })
    )
    expect(result).toBe(mockAluguel)
  })

  it('formata dia_vencimento com zero à esquerda (dia < 10)', async () => {
    const imovelDia5 = { ...mockImovel, dia_vencimento: 5 }
    chain.maybeSingle.mockResolvedValueOnce({ data: null })
    chain.single.mockResolvedValueOnce({ data: mockAluguel, error: null })

    await createMonthlyCharge(imovelDia5, mockInquilino, '2026-05')

    const callArg = chargeService.createCharge.mock.calls[0][1]
    expect(callArg.dueDate).toBe('2026-05-05')
  })

  it('inclui discount apenas quando desconto_percentual > 0', async () => {
    const imovelComDesconto = { ...mockImovel, desconto_percentual: 5 }
    chain.maybeSingle.mockResolvedValueOnce({ data: null })
    chain.single.mockResolvedValueOnce({ data: mockAluguel, error: null })

    await createMonthlyCharge(imovelComDesconto, mockInquilino, '2026-05')

    const callArg = chargeService.createCharge.mock.calls[0][1]
    expect(callArg.discount).toEqual({ value: 5, type: 'PERCENTAGE', dueDateLimitDays: 0 })
  })

  it('não inclui discount quando desconto_percentual = 0', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })
    chain.single.mockResolvedValueOnce({ data: mockAluguel, error: null })

    await createMonthlyCharge(mockImovel, mockInquilino, '2026-05')

    const callArg = chargeService.createCharge.mock.calls[0][1]
    expect(callArg).not.toHaveProperty('discount')
  })

  it('dispara e-mail sem bloquear a resposta', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })
    chain.single.mockResolvedValueOnce({ data: mockAluguel, error: null })

    await createMonthlyCharge(mockImovel, mockInquilino, '2026-05')

    expect(emailService.sendChargeCreatedEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantEmail:    mockInquilino.email,
        referenceMonth: '2026-05',
      })
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// createRecurringCharge
// ─────────────────────────────────────────────────────────────────────────────

describe('createRecurringCharge', () => {
  it('retorna subscriptionId existente sem criar nova assinatura', async () => {
    const imovelComSub = { ...mockImovel, asaas_subscription_id: 'sub_existing' }

    const result = await createRecurringCharge(imovelComSub, mockInquilino)

    expect(result).toBe('sub_existing')
    expect(chargeService.createSubscription).not.toHaveBeenCalled()
  })

  it('cria assinatura no Asaas e salva o ID no imóvel', async () => {
    chargeService.upsertCustomer.mockResolvedValue({ id: 'cus_xyz' })
    chargeService.createSubscription.mockResolvedValue({ id: 'sub_new123' })

    const result = await createRecurringCharge(mockImovel, mockInquilino)

    expect(chargeService.createSubscription).toHaveBeenCalledWith(
      LANDLORD_ID,
      expect.objectContaining({
        customer: 'cus_xyz',
        value:    mockImovel.valor_aluguel,
      })
    )
    expect(supabase.from).toHaveBeenCalledWith('imoveis')
    expect(result).toBe('sub_new123')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getChargeStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('getChargeStatus', () => {
  it('lança 404 se a cobrança não existir', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    await expect(getChargeStatus(LANDLORD_ID, ALUGUEL_ID)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('mapeia status CONFIRMED do Asaas para pago', async () => {
    const aluguel = { ...mockAluguel }
    chain.maybeSingle.mockResolvedValueOnce({ data: aluguel })
    chargeService.getCharge.mockResolvedValue({ status: 'CONFIRMED', paymentDate: null })
    chain.single.mockResolvedValueOnce({ data: { ...aluguel, status: 'pago' }, error: null })

    const result = await getChargeStatus(LANDLORD_ID, ALUGUEL_ID)

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'pago' }))
    expect(result.status).toBe('pago')
  })

  it('preenche data_pagamento e valor_pago quando paymentDate está presente', async () => {
    const aluguel = { ...mockAluguel }
    chain.maybeSingle.mockResolvedValueOnce({ data: aluguel })
    chargeService.getCharge.mockResolvedValue({
      status:      'RECEIVED',
      paymentDate: '2026-05-08',
      value:       1500,
      billingType: 'PIX',
    })
    chain.single.mockResolvedValueOnce({
      data: { ...aluguel, status: 'pago', data_pagamento: '2026-05-08', valor_pago: 1500 },
      error: null,
    })

    const result = await getChargeStatus(LANDLORD_ID, ALUGUEL_ID)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data_pagamento:   '2026-05-08',
        valor_pago:       1500,
        metodo_pagamento: 'PIX',
      })
    )
    expect(result.data_pagamento).toBe('2026-05-08')
    expect(result.valor_pago).toBe(1500)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// cancelRentalCharge
// ─────────────────────────────────────────────────────────────────────────────

describe('cancelRentalCharge', () => {
  it('lança 404 se a cobrança não existir', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    await expect(cancelRentalCharge(LANDLORD_ID, ALUGUEL_ID)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('lança 409 ao tentar cancelar cobrança já paga', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...mockAluguel, status: 'pago' } })

    await expect(cancelRentalCharge(LANDLORD_ID, ALUGUEL_ID)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('chama Asaas e marca como cancelado', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...mockAluguel, status: 'pendente' } })
    chargeService.cancelCharge.mockResolvedValue({ deleted: true })
    chain.single.mockResolvedValueOnce({ data: { ...mockAluguel, status: 'cancelado' }, error: null })

    const result = await cancelRentalCharge(LANDLORD_ID, ALUGUEL_ID)

    expect(chargeService.cancelCharge).toHaveBeenCalledWith(LANDLORD_ID, 'pay_abc123')
    expect(chain.update).toHaveBeenCalledWith({ status: 'cancelado' })
    expect(result.status).toBe('cancelado')
  })

  it('não chama Asaas se cobrança já está cancelado', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...mockAluguel, status: 'cancelado' } })

    await cancelRentalCharge(LANDLORD_ID, ALUGUEL_ID)

    expect(chargeService.cancelCharge).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// generatePixQrCode
// ─────────────────────────────────────────────────────────────────────────────

describe('generatePixQrCode', () => {
  it('lança 404 se a cobrança não existir', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    await expect(generatePixQrCode(LANDLORD_ID, ALUGUEL_ID)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('retorna do cache sem chamar o Asaas', async () => {
    chain.maybeSingle.mockResolvedValueOnce({
      data: { ...mockAluguel, asaas_pix_qrcode: '00020126580014BR.GOV.BCB.PIX' },
    })

    const result = await generatePixQrCode(LANDLORD_ID, ALUGUEL_ID)

    expect(chargeService.getPixQrCode).not.toHaveBeenCalled()
    expect(result).toEqual({ encodedImage: null, payload: '00020126580014BR.GOV.BCB.PIX' })
  })

  it('busca no Asaas e cacheia o payload', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...mockAluguel, asaas_pix_qrcode: null } })
    chargeService.getPixQrCode.mockResolvedValue({
      encodedImage: 'base64img==',
      payload:      '00020126580014BR.GOV.BCB.PIX',
    })

    const result = await generatePixQrCode(LANDLORD_ID, ALUGUEL_ID)

    expect(chargeService.getPixQrCode).toHaveBeenCalledWith(LANDLORD_ID, 'pay_abc123')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ asaas_pix_qrcode: '00020126580014BR.GOV.BCB.PIX' })
    )
    expect(result.payload).toBe('00020126580014BR.GOV.BCB.PIX')
  })
})
