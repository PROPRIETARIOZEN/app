'use strict'

const express = require('express')
const router = express.Router()
const { authMiddleware } = require('../middleware/auth')
const supabase = require('../lib/supabase')
const {
  createMonthlyCharge,
  getChargeStatus,
  cancelRentalCharge,
  generatePixQrCode,
} = require('../services/rentalChargeService')

// ── POST /api/charges/manual ──────────────────────────────────────────────────
// Cria uma cobrança avulsa para um imóvel e mês específico.
router.post('/manual', authMiddleware, async (req, res) => {
  try {
    const { imovelId, referenceMonth } = req.body

    if (!imovelId || !referenceMonth || !/^\d{4}-\d{2}$/.test(referenceMonth)) {
      return res.status(400).json({
        error: 'imovelId e referenceMonth (YYYY-MM) são obrigatórios.',
      })
    }

    const { data: imovel } = await supabase
      .from('imoveis')
      .select('*')
      .eq('id', imovelId)
      .eq('user_id', req.userId)
      .eq('ativo', true)
      .maybeSingle()

    if (!imovel) return res.status(404).json({ error: 'Imóvel não encontrado.' })

    const { data: inquilino } = await supabase
      .from('inquilinos')
      .select('*')
      .eq('imovel_id', imovel.id)
      .eq('ativo', true)
      .maybeSingle()

    if (!inquilino) return res.status(404).json({ error: 'Inquilino não encontrado.' })

    const aluguel = await createMonthlyCharge(imovel, inquilino, referenceMonth)
    res.status(201).json(aluguel)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] POST /manual:', err.message)
    res.status(500).json({ error: 'Erro ao criar cobrança.' })
  }
})

// ── GET /api/charges ──────────────────────────────────────────────────────────
// Lista cobranças do proprietário autenticado com filtros e paginação.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, imovelId, page = '1', limit = '20' } = req.query
    const pageNum  = Math.max(1, Number(page))
    const limitNum = Math.min(100, Math.max(1, Number(limit)))
    const from     = (pageNum - 1) * limitNum
    const to       = from + limitNum - 1

    // Filtra cobranças cujos imóveis pertencem ao proprietário autenticado
    let query = supabase
      .from('alugueis')
      .select('*, imoveis!inner(user_id)', { count: 'exact' })
      .eq('imoveis.user_id', req.userId)
      .order('data_vencimento', { ascending: false })
      .range(from, to)

    if (status)   query = query.eq('status', status)
    if (imovelId) query = query.eq('imovel_id', imovelId)

    const { data: charges, count, error } = await query
    if (error) throw error

    res.json({
      data:       charges,
      total:      count,
      page:       pageNum,
      totalPages: Math.ceil(count / limitNum),
    })
  } catch (err) {
    console.error('[Charges] GET /:', err.message)
    res.status(500).json({ error: 'Erro ao buscar cobranças.' })
  }
})

// ── GET /api/charges/:id/status ───────────────────────────────────────────────
router.get('/:id/status', authMiddleware, async (req, res) => {
  try {
    const aluguel = await getChargeStatus(req.userId, req.params.id)
    res.json(aluguel)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] GET /:id/status:', err.message)
    res.status(500).json({ error: 'Erro ao sincronizar status.' })
  }
})

// ── DELETE /api/charges/:id ───────────────────────────────────────────────────
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const aluguel = await cancelRentalCharge(req.userId, req.params.id)
    res.json(aluguel)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] DELETE /:id:', err.message)
    res.status(500).json({ error: 'Erro ao cancelar cobrança.' })
  }
})

// ── GET /api/charges/:id/pix ──────────────────────────────────────────────────
router.get('/:id/pix', authMiddleware, async (req, res) => {
  try {
    const qrData = await generatePixQrCode(req.userId, req.params.id)
    res.json(qrData)
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ error: err.message })
    console.error('[Charges] GET /:id/pix:', err.message)
    res.status(500).json({ error: 'Erro ao gerar QR Code Pix.' })
  }
})

module.exports = router
