'use strict'

const express = require('express')
const { authMiddleware } = require('../middleware/auth')
const { createSubAccount, getAccountStatus } = require('../services/asaas/accountService')
const { setupWebhook } = require('../services/asaas/webhookService')
const { AsaasIntegrationError } = require('../services/asaas/AsaasIntegrationError')
const supabase = require('../lib/supabase')

const router = express.Router()

router.use(authMiddleware)

// ── POST /api/asaas/onboarding ────────────────────────────────────────────────
router.post('/onboarding', async (req, res) => {
  try {
    const userId = req.userId

    // ── 1. Verificar se já existe subconta ──────────────────────────────────
    const { data: existing } = await supabase
      .from('profiles')
      .select('asaas_account_id, asaas_account_status')
      .eq('id', userId)
      .maybeSingle()

    if (existing?.asaas_account_id) {
      return res.status(409).json({
        error: 'Você já possui uma conta Asaas vinculada.',
        accountStatus: existing.asaas_account_status,
      })
    }

    // ── 2. Validação mínima ──────────────────────────────────────────────────
    const proprietarioData = req.body
    const required = ['name', 'email', 'cpfCnpj', 'mobilePhone', 'address',
                      'addressNumber', 'province', 'postalCode']
    const missing = required.filter(f => !proprietarioData[f])
    if (missing.length > 0) {
      return res.status(422).json({
        error: `Campos obrigatórios ausentes: ${missing.join(', ')}`,
      })
    }

    // ── 3. Criar subconta no Asaas ───────────────────────────────────────────
    const result = await createSubAccount(userId, proprietarioData)

    // ── 4. Registrar webhooks na subconta ────────────────────────────────────
    try {
      const { getDecryptedApiKey } = require('../services/asaas/accountService')
      const decryptedKey = await getDecryptedApiKey(userId)
      setupWebhook(result.asaasId, decryptedKey).catch(err => {
        console.error('[Asaas] Falha ao registrar webhook pós-onboarding:', err.message)
      })
    } catch (err) {
      console.error('[Asaas] Não foi possível obter apiKey para webhook:', err.message)
    }

    return res.status(201).json({
      message:
        'Conta criada com sucesso! Você receberá um e-mail do Asaas para ' +
        'definir sua senha e enviar os documentos necessários. ' +
        'Após a aprovação (geralmente 1-2 dias úteis), você já poderá ' +
        'receber aluguéis diretamente na sua conta.',
      asaasId:       result.asaasId,
      accountStatus: result.accountStatus,
      nextStep:      'Verifique seu e-mail para completar o cadastro no painel Asaas.',
    })
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      return res.status(error.statusCode).json(error.toJSON())
    }
    console.error('[Asaas] Erro inesperado no onboarding:', error.message)
    return res.status(500).json({ error: 'Erro interno ao criar conta Asaas.' })
  }
})

// ── GET /api/asaas/status ─────────────────────────────────────────────────────
router.get('/status', async (req, res) => {
  try {
    const status = await getAccountStatus(req.userId)
    return res.json(status)
  } catch (error) {
    if (error instanceof AsaasIntegrationError) {
      return res.status(error.statusCode).json(error.toJSON())
    }
    return res.status(500).json({ error: 'Erro ao consultar status da conta.' })
  }
})

// ── GET /api/asaas/account ────────────────────────────────────────────────────
router.get('/account', async (req, res) => {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('asaas_account_id, asaas_account_status, asaas_wallet_id')
      .eq('id', req.userId)
      .maybeSingle()

    if (error) throw error
    if (!profile?.asaas_account_id) {
      return res.status(404).json({ error: 'Conta Asaas não encontrada.' })
    }

    return res.json(profile)
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar conta.' })
  }
})

module.exports = router
