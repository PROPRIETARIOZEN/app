'use strict'

require('dotenv').config()
const express = require('express')

const asaasRoutes = require('./routes/asaas')
const webhookRoutes = require('./routes/webhooks')
const chargesRoutes = require('./routes/charges')
const { startChargeScheduler } = require('./jobs/chargeScheduler')

const app = express()

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/asaas', asaasRoutes)
app.use('/api/webhooks', webhookRoutes)
app.use('/api/charges', chargesRoutes)

app.get('/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }))

// ── Tratamento de erros global ────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Express] Erro não tratado:', err.message)
  res.status(500).json({ error: 'Erro interno do servidor.' })
})

// ── Inicialização ─────────────────────────────────────────────────────────────
function start() {
  if (process.env.NODE_ENV !== 'test') {
    startChargeScheduler()
  }

  const PORT = process.env.PORT || 3001
  app.listen(PORT, () => {
    console.info(`[Server] Rodando na porta ${PORT} (${process.env.NODE_ENV})`)
  })
}

if (require.main === module) {
  start()
}

module.exports = app
