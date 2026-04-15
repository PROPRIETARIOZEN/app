'use strict'

process.env.ASAAS_API_KEY_ROOT    = 'test_root_api_key_fake'
process.env.ASAAS_BASE_URL        = 'https://sandbox.asaas.com/api/v3'
process.env.ASAAS_ENCRYPTION_KEY  = 'a'.repeat(64)
process.env.SUPABASE_URL          = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
process.env.NODE_ENV              = 'test'

// ── Mocks ──────────────────────────────────────────────────────────────────────

jest.mock('axios')
jest.mock('../../src/lib/supabase', () => ({ from: jest.fn() }))

const axios    = require('axios')
const supabase = require('../../src/lib/supabase')

const mockAxiosInstance = {
  post: jest.fn(),
  get:  jest.fn(),
  delete: jest.fn(),
  interceptors: {
    request:  { use: jest.fn() },
    response: { use: jest.fn() },
  },
}
axios.create.mockReturnValue(mockAxiosInstance)

const {
  createSubAccount,
  getAccountStatus,
  encryptApiKey,
  decryptApiKey,
} = require('../../src/services/asaas/accountService')

// ── Supabase chain helper ──────────────────────────────────────────────────────

let chain

beforeEach(() => {
  jest.clearAllMocks()

  chain = {
    select:      jest.fn().mockReturnThis(),
    eq:          jest.fn().mockReturnThis(),
    update:      jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(),
    single:      jest.fn(),
  }
  supabase.from = jest.fn().mockReturnValue(chain)
})

// ── Fixtures ───────────────────────────────────────────────────────────────────

const USER_ID = 'user-uuid-1234'
const PROPRIETARIO_DATA = {
  name:          'João Silva',
  email:         'joao@example.com',
  cpfCnpj:       '12345678901',
  birthDate:     '1985-06-15',
  mobilePhone:   '11999990000',
  address:       'Rua das Flores',
  addressNumber: '123',
  province:      'Centro',
  postalCode:    '01310100',
}

const ASAAS_CREATE_RESPONSE = {
  data: {
    id:            'acc_subaccount_abc123',
    apiKey:        '$aact_subKey_REAL_API_KEY_FROM_ASAAS',
    walletId:      'wallet_xyz789',
    accountStatus: 'PENDING',
  },
}

// ── Testes de criptografia ────────────────────────────────────────────────────

describe('encryptApiKey / decryptApiKey', () => {
  const originalKey = '$aact_subKey_REAL_API_KEY_FROM_ASAAS'

  test('criptografa e descriptografa corretamente', () => {
    const encrypted = encryptApiKey(originalKey)
    const decrypted = decryptApiKey(encrypted)
    expect(decrypted).toBe(originalKey)
  })

  test('dois encripts do mesmo valor produzem ciphertexts diferentes (IV aleatório)', () => {
    const enc1 = encryptApiKey(originalKey)
    const enc2 = encryptApiKey(originalKey)
    expect(enc1).not.toBe(enc2)
    expect(decryptApiKey(enc1)).toBe(originalKey)
    expect(decryptApiKey(enc2)).toBe(originalKey)
  })

  test('o resultado criptografado tem formato iv:authTag:ciphertext', () => {
    const encrypted = encryptApiKey(originalKey)
    const parts = encrypted.split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toMatch(/^[0-9a-f]{32}$/)
    expect(parts[1]).toMatch(/^[0-9a-f]{32}$/)
    expect(parts[2].length).toBeGreaterThan(0)
  })

  test('a apiKey nunca aparece no texto criptografado', () => {
    const encrypted = encryptApiKey(originalKey)
    expect(encrypted).not.toContain(originalKey)
    expect(encrypted).not.toContain('$aact')
    expect(encrypted).not.toContain('REAL_API_KEY')
  })
})

// ── Testes de createSubAccount ────────────────────────────────────────────────

describe('createSubAccount', () => {
  test('cria subconta com sucesso e persiste no banco', async () => {
    // profiles.asaas_account_id é null → sem duplicata
    chain.maybeSingle.mockResolvedValueOnce({ data: { asaas_account_id: null } })
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)
    // update retorna sem erro
    chain.eq.mockReturnThis()

    const result = await createSubAccount(USER_ID, PROPRIETARIO_DATA)

    expect(supabase.from).toHaveBeenCalledWith('profiles')
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({
        asaas_account_id:     'acc_subaccount_abc123',
        asaas_account_status: 'PENDING',
      })
    )
    expect(result).toEqual({
      asaasId:       'acc_subaccount_abc123',
      walletId:      'wallet_xyz789',
      accountStatus: 'PENDING',
    })
  })

  test('update() é chamado ANTES de qualquer retorno', async () => {
    const callOrder = []

    chain.maybeSingle.mockResolvedValueOnce({ data: { asaas_account_id: null } })
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    chain.update.mockImplementation(() => {
      callOrder.push('update')
      return chain
    })

    await createSubAccount(USER_ID, PROPRIETARIO_DATA)

    expect(callOrder[0]).toBe('update')
  })

  test('apiKey nunca é logada — console.error não contém a apiKey', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    chain.maybeSingle.mockResolvedValueOnce({ data: { asaas_account_id: null } })
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    // Forçar falha no update para acionar o log de erro
    chain.eq.mockReturnThis()
    // Override: fazer o último .eq() rejeitar quando awaited
    const updChain = { ...chain, eq: jest.fn().mockRejectedValue(new Error('DB error')) }
    chain.update.mockReturnValueOnce(updChain)

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA)).rejects.toThrow()

    const rawApiKey = ASAAS_CREATE_RESPONSE.data.apiKey
    const allCalls = consoleSpy.mock.calls.flat(Infinity).join(' ')
    expect(allCalls).not.toContain(rawApiKey)
    expect(allCalls).not.toContain('$aact')

    consoleSpy.mockRestore()
  })

  test('a apiKey criptografada (não a raw) é passada para o banco', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { asaas_account_id: null } })
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    let capturedPayload = null
    chain.update.mockImplementation((payload) => {
      capturedPayload = payload
      return chain
    })

    await createSubAccount(USER_ID, PROPRIETARIO_DATA)

    expect(capturedPayload.asaas_api_key_enc).not.toBe(ASAAS_CREATE_RESPONSE.data.apiKey)
    expect(decryptApiKey(capturedPayload.asaas_api_key_enc)).toBe(ASAAS_CREATE_RESPONSE.data.apiKey)
  })

  test('lança AsaasIntegrationError (409) se já existe conta vinculada', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { asaas_account_id: 'acc_existing' } })

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA))
      .rejects.toMatchObject({ name: 'AsaasIntegrationError', statusCode: 409 })
  })

  test('propaga AsaasIntegrationError quando o Asaas retorna erro', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { asaas_account_id: null } })

    const { AsaasIntegrationError } = require('../../src/services/asaas/AsaasIntegrationError')
    mockAxiosInstance.post.mockRejectedValue(
      new AsaasIntegrationError('CPF ou CNPJ inválido.', 422, 'invalid_cpfCnpj'),
    )

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA))
      .rejects.toMatchObject({ statusCode: 422, asaasCode: 'invalid_cpfCnpj' })
  })

  test('lança erro com contexto claro quando o save falha', async () => {
    chain.maybeSingle.mockResolvedValueOnce({ data: { asaas_account_id: null } })
    mockAxiosInstance.post.mockResolvedValue(ASAAS_CREATE_RESPONSE)

    // Simular erro do Supabase no update
    const updChain = { eq: jest.fn().mockRejectedValue(new Error('DB connection failed')) }
    chain.update.mockReturnValueOnce(updChain)

    await expect(createSubAccount(USER_ID, PROPRIETARIO_DATA))
      .rejects.toMatchObject({ statusCode: 500, asaasCode: 'dbSaveFailed' })
  })
})
