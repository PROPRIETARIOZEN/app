'use strict'

process.env.SUPABASE_URL             = 'https://test.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role_key'
process.env.NODE_ENV                 = 'test'

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('node-cron')
jest.mock('../../src/lib/supabase', () => ({ from: jest.fn() }))
jest.mock('../../src/services/rentalChargeService', () => ({
  createMonthlyCharge: jest.fn(),
}))

const cron             = require('node-cron')
const supabase         = require('../../src/lib/supabase')
const { createMonthlyCharge } = require('../../src/services/rentalChargeService')

const { startChargeScheduler } = require('../../src/jobs/chargeScheduler')

let scheduledCallback

beforeEach(() => {
  jest.clearAllMocks()
  scheduledCallback = null

  cron.schedule.mockImplementation((pattern, callback, options) => {
    scheduledCallback = callback
    return { stop: jest.fn() }
  })
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

const IMOVEL_A = { id: 'im_a', user_id: 'lnd_1', billing_mode: 'MANUAL', ativo: true }
const IMOVEL_B = { id: 'im_b', user_id: 'lnd_2', billing_mode: 'MANUAL', ativo: true }
const INQUILINO = { id: 'inq_1', imovel_id: 'im_a', nome: 'Ana', ativo: true }

// Helper: cria um mock encadeado para o query builder do Supabase
function makeQueryMock(result) {
  const chain = {
    select:     jest.fn().mockReturnThis(),
    eq:         jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue(result),
  }
  return chain
}

// ─────────────────────────────────────────────────────────────────────────────

describe('startChargeScheduler', () => {
  it('registra cron no padrão correto com timezone Brasília', () => {
    startChargeScheduler()

    expect(cron.schedule).toHaveBeenCalledWith(
      '0 8 1 * *',
      expect.any(Function),
      { timezone: 'America/Sao_Paulo' }
    )
  })

  it('busca apenas imóveis MANUAL ativos', async () => {
    // Mock da query de imoveis
    supabase.from.mockImplementation((table) => {
      if (table === 'imoveis') {
        return {
          select: jest.fn().mockReturnThis(),
          eq:     jest.fn().mockReturnThis(),
          then:   jest.fn(),
          // Simula a resolução completa da cadeia
          ...{},
        }
      }
      return { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), maybeSingle: jest.fn().mockResolvedValue({ data: null }) }
    })

    // Abordagem mais direta: mock do from retornando a cadeia completa
    const imoveisChain = {
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
    }
    // Última chamada .eq resolve para data + error
    imoveisChain.eq.mockReturnValueOnce(imoveisChain).mockResolvedValueOnce({ data: [IMOVEL_A], error: null })

    const inquilinoChain = {
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: INQUILINO, error: null }),
    }

    supabase.from.mockImplementation((table) => {
      if (table === 'imoveis')    return imoveisChain
      if (table === 'inquilinos') return inquilinoChain
      return {}
    })

    createMonthlyCharge.mockResolvedValue({})

    startChargeScheduler()
    await scheduledCallback()

    const fromCalls = supabase.from.mock.calls.map(c => c[0])
    expect(fromCalls).toContain('imoveis')
  })

  it('cria cobranças para todos os imóveis encontrados', async () => {
    const imoveisChain = {
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
    }
    let eqCount = 0
    imoveisChain.eq.mockImplementation(() => {
      eqCount++
      if (eqCount >= 2) return Promise.resolve({ data: [IMOVEL_A, IMOVEL_B], error: null })
      return imoveisChain
    })

    const inquilinoChain = {
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: INQUILINO, error: null }),
    }

    supabase.from.mockImplementation((table) => {
      if (table === 'imoveis')    return imoveisChain
      if (table === 'inquilinos') return inquilinoChain
      return {}
    })

    createMonthlyCharge.mockResolvedValue({})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).toHaveBeenCalledTimes(2)
  })

  it('continua processando os demais imóveis quando um falha', async () => {
    const imoveisChain = {
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
    }
    let eqCount = 0
    imoveisChain.eq.mockImplementation(() => {
      eqCount++
      if (eqCount >= 2) return Promise.resolve({ data: [IMOVEL_A, IMOVEL_B], error: null })
      return imoveisChain
    })

    const inquilinoChain = {
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: INQUILINO, error: null }),
    }

    supabase.from.mockImplementation((table) => {
      if (table === 'imoveis')    return imoveisChain
      if (table === 'inquilinos') return inquilinoChain
      return {}
    })

    createMonthlyCharge
      .mockRejectedValueOnce(new Error('Asaas timeout'))
      .mockResolvedValueOnce({})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).toHaveBeenCalledTimes(2)
  })

  it('registra erro e continua quando o inquilino não é encontrado', async () => {
    const imoveisChain = {
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
    }
    let eqCount = 0
    imoveisChain.eq.mockImplementation(() => {
      eqCount++
      if (eqCount >= 2) return Promise.resolve({ data: [IMOVEL_A], error: null })
      return imoveisChain
    })

    const inquilinoChain = {
      select:      jest.fn().mockReturnThis(),
      eq:          jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    }

    supabase.from.mockImplementation((table) => {
      if (table === 'imoveis')    return imoveisChain
      if (table === 'inquilinos') return inquilinoChain
      return {}
    })

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).not.toHaveBeenCalled()
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/\[Scheduler\].*im_a/)
    )

    consoleSpy.mockRestore()
  })

  it('aborta graciosamente se a busca de imóveis falhar', async () => {
    const imoveisChain = {
      select: jest.fn().mockReturnThis(),
      eq:     jest.fn().mockReturnThis(),
    }
    let eqCount = 0
    imoveisChain.eq.mockImplementation(() => {
      eqCount++
      if (eqCount >= 2) return Promise.resolve({ data: null, error: new Error('DB connection lost') })
      return imoveisChain
    })

    supabase.from.mockImplementation(() => imoveisChain)

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    startChargeScheduler()
    await scheduledCallback()

    expect(createMonthlyCharge).not.toHaveBeenCalled()
    consoleSpy.mockRestore()
  })
})
