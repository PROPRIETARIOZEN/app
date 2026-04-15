'use strict'

process.env.ASAAS_API_KEY_ROOT        = 'test_root_api_key'
process.env.ASAAS_ENCRYPTION_KEY      = 'c'.repeat(64)
process.env.SUPABASE_URL              = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
process.env.NODE_ENV                  = 'test'

jest.mock('axios')
jest.mock('../../src/lib/supabase', () => ({ from: jest.fn() }))
jest.mock('firebase-admin', () => ({
  messaging: () => ({ send: jest.fn().mockResolvedValue('mock_message_id') }),
}), { virtual: true })

const axios    = require('axios')
const supabase = require('../../src/lib/supabase')

axios.create.mockReturnValue({
  post: jest.fn(),
  get:  jest.fn(),
  interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
})

const {
  handleWebhookEvent,
  handleAccountStatusUpdated,
  handlePaymentReceived,
  handlePaymentOverdue,
} = require('../../src/services/asaas/webhookService')

// ── Chain helper ──────────────────────────────────────────────────────────────

let chain

beforeEach(() => {
  jest.clearAllMocks()

  chain = {
    select:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    or:          jest.fn().mockReturnThis(),
    update:      jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
  }
  supabase.from = jest.fn().mockReturnValue(chain)
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ACCOUNT_STATUS_UPDATED_PAYLOAD = {
  event:   'ACCOUNT_STATUS_UPDATED',
  account: {
    id:            'acc_subaccount_abc123',
    accountStatus: 'ACTIVE',
  },
}

const PAYMENT_RECEIVED_PAYLOAD = {
  event:   'PAYMENT_RECEIVED',
  payment: {
    id:            'pay_abc123',
    value:         1500.00,
    billingType:   'PIX',
    status:        'RECEIVED',
    paymentDate:   '2026-05-08',
    asaasAccount:  'acc_subaccount_abc123',
    transferredBy: { walletId: 'wallet_xyz789' },
  },
}

const PAYMENT_OVERDUE_PAYLOAD = {
  event:   'PAYMENT_OVERDUE',
  payment: {
    id:            'pay_overdue_456',
    value:         2000.00,
    billingType:   'BOLETO',
    status:        'OVERDUE',
    asaasAccount:  'acc_subaccount_abc123',
    transferredBy: { walletId: 'wallet_xyz789' },
  },
}

const MOCK_PROFILE = {
  id:                   'user-uuid-1',
  asaas_account_id:     'acc_subaccount_abc123',
  asaas_account_status: 'PENDING',
}

// ── handleWebhookEvent (roteador) ─────────────────────────────────────────────

describe('handleWebhookEvent — roteamento', () => {
  test('nunca lança — resolve mesmo se o handler interno falhar', async () => {
    chain.maybeSingle.mockResolvedValue({ data: null })

    await expect(
      handleWebhookEvent(ACCOUNT_STATUS_UPDATED_PAYLOAD),
    ).resolves.toBeUndefined()
  })

  test('resolve para eventos desconhecidos sem lançar', async () => {
    await expect(
      handleWebhookEvent({ event: 'UNKNOWN_EVENT_TYPE', data: {} }),
    ).resolves.toBeUndefined()
  })

  test('resolve quando payload não tem campo "event"', async () => {
    await expect(handleWebhookEvent({})).resolves.toBeUndefined()
  })
})

// ── ACCOUNT_STATUS_UPDATED ────────────────────────────────────────────────────

describe('handleAccountStatusUpdated', () => {
  test('atualiza asaas_account_status no banco quando conta é aprovada', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...MOCK_PROFILE } })

    await handleAccountStatusUpdated(ACCOUNT_STATUS_UPDATED_PAYLOAD)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ asaas_account_status: 'ACTIVE' }),
    )
  })

  test('não atualiza se a conta não for encontrada no banco', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    await handleAccountStatusUpdated(ACCOUNT_STATUS_UPDATED_PAYLOAD)

    expect(chain.update).not.toHaveBeenCalled()
  })

  test('processa evento REJECTED sem lançar', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...MOCK_PROFILE } })

    const rejectedEvent = {
      ...ACCOUNT_STATUS_UPDATED_PAYLOAD,
      account: { ...ACCOUNT_STATUS_UPDATED_PAYLOAD.account, accountStatus: 'REJECTED' },
    }

    await expect(handleAccountStatusUpdated(rejectedEvent)).resolves.toBeUndefined()
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ asaas_account_status: 'REJECTED' }),
    )
  })
})

// ── PAYMENT_RECEIVED ──────────────────────────────────────────────────────────

describe('handlePaymentReceived', () => {
  test('atualiza o aluguel correspondente ao pagamento', async () => {
    // 1ª from('profiles') → maybeSingle retorna profile
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...MOCK_PROFILE } })

    await handlePaymentReceived(PAYMENT_RECEIVED_PAYLOAD)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pago' })
    )
  })

  test('não lança se a subconta não for encontrada', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    await expect(handlePaymentReceived(PAYMENT_RECEIVED_PAYLOAD)).resolves.toBeUndefined()
  })

  test('não lança se o payment.id estiver ausente', async () => {
    await expect(
      handlePaymentReceived({ event: 'PAYMENT_RECEIVED', payment: {} }),
    ).resolves.toBeUndefined()
  })
})

// ── PAYMENT_OVERDUE ───────────────────────────────────────────────────────────

describe('handlePaymentOverdue', () => {
  test('atualiza o aluguel para atrasado', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { ...MOCK_PROFILE } })

    await handlePaymentOverdue(PAYMENT_OVERDUE_PAYLOAD)

    expect(chain.update).toHaveBeenCalledWith({ status: 'atrasado' })
  })

  test('não lança se subconta não encontrada', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: null })

    await expect(handlePaymentOverdue(PAYMENT_OVERDUE_PAYLOAD)).resolves.toBeUndefined()
  })
})

// ── Validação do token no handler Express ─────────────────────────────────────

describe('Webhook route — validação do token', () => {
  test.skip('retorna 401 com token inválido', () => {})
  test.skip('retorna 200 com token válido', () => {})
})
