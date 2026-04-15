'use strict'

process.env.ASAAS_API_KEY_ROOT        = 'test_root_api_key'
process.env.ASAAS_BASE_URL            = 'https://sandbox.asaas.com/api/v3'
process.env.ASAAS_ENCRYPTION_KEY      = 'b'.repeat(64)
process.env.WEBHOOK_BASE_URL          = 'https://abc123.ngrok.io'
process.env.ASAAS_WEBHOOK_TOKEN       = 'test_webhook_token_abc'
process.env.SUPABASE_URL              = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
process.env.NODE_ENV                  = 'test'

jest.mock('axios')
jest.mock('../../src/lib/supabase', () => ({ from: jest.fn() }))

const axios    = require('axios')
const supabase = require('../../src/lib/supabase')

const mockAxiosInstance = {
  post: jest.fn(),
  get:  jest.fn(),
  interceptors: {
    request:  { use: jest.fn() },
    response: { use: jest.fn() },
  },
}
axios.create.mockReturnValue(mockAxiosInstance)

const { setupWebhook } = require('../../src/services/asaas/webhookService')

// ── Testes de setupWebhook ────────────────────────────────────────────────────

describe('setupWebhook', () => {
  const ASAAS_ID        = 'acc_subaccount_abc123'
  const DECRYPTED_SUBKEY = '$aact_subKey_DECRYPTED_FOR_TEST'
  const ROOT_KEY        = process.env.ASAAS_API_KEY_ROOT

  beforeEach(() => {
    jest.clearAllMocks()
    mockAxiosInstance.post.mockResolvedValue({ data: { id: 'webhook_001', enabled: true } })
  })

  test('usa a apiKey da subconta — NÃO a conta raiz', async () => {
    await setupWebhook(ASAAS_ID, DECRYPTED_SUBKEY)

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({ access_token: DECRYPTED_SUBKEY }),
      }),
    )

    const usedKeys = axios.create.mock.calls.map(c => c[0]?.headers?.access_token)
    expect(usedKeys).not.toContain(ROOT_KEY)
  })

  test('envia POST /webhook com a URL correta', async () => {
    await setupWebhook(ASAAS_ID, DECRYPTED_SUBKEY)

    expect(mockAxiosInstance.post).toHaveBeenCalledWith(
      '/webhook',
      expect.objectContaining({
        url:     'https://abc123.ngrok.io/api/webhooks/asaas',
        enabled: true,
      }),
    )
  })

  test('registra todos os 4 eventos necessários', async () => {
    await setupWebhook(ASAAS_ID, DECRYPTED_SUBKEY)

    const [, payload] = mockAxiosInstance.post.mock.calls[0]
    expect(payload.events).toEqual(
      expect.arrayContaining([
        'PAYMENT_RECEIVED',
        'PAYMENT_OVERDUE',
        'PAYMENT_DELETED',
        'ACCOUNT_STATUS_UPDATED',
      ]),
    )
  })

  test('inclui o ASAAS_WEBHOOK_TOKEN no payload do webhook', async () => {
    await setupWebhook(ASAAS_ID, DECRYPTED_SUBKEY)

    const [, payload] = mockAxiosInstance.post.mock.calls[0]
    expect(payload.authToken).toBe(process.env.ASAAS_WEBHOOK_TOKEN)
  })

  test('não lança erro se webhook já existente (409 idempotente)', async () => {
    const { AsaasIntegrationError } = require('../../src/services/asaas/AsaasIntegrationError')
    mockAxiosInstance.post.mockRejectedValue(
      new AsaasIntegrationError('Webhook já existente.', 409, 'webhookAlreadyExists'),
    )

    await expect(setupWebhook(ASAAS_ID, DECRYPTED_SUBKEY)).resolves.toBeUndefined()
  })

  test('não registra webhook se WEBHOOK_BASE_URL não configurada', async () => {
    const originalUrl = process.env.WEBHOOK_BASE_URL
    delete process.env.WEBHOOK_BASE_URL

    await setupWebhook(ASAAS_ID, DECRYPTED_SUBKEY)

    expect(mockAxiosInstance.post).not.toHaveBeenCalled()

    process.env.WEBHOOK_BASE_URL = originalUrl
  })
})
