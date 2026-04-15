'use strict'

const cron = require('node-cron')
const supabase = require('../lib/supabase')
const { createMonthlyCharge } = require('../services/rentalChargeService')

/**
 * Inicia o scheduler de geração automática de cobranças.
 *
 * Dispara no dia 1 de cada mês às 08:00 horário de Brasília.
 * Processa apenas imóveis com billing_mode=MANUAL e ativo=true — os imóveis
 * AUTOMATIC têm cobranças geradas diretamente pelo Asaas via assinatura recorrente.
 *
 * A função é idempotente por design: mesmo que rode duas vezes no mesmo dia,
 * createMonthlyCharge não cria duplicatas (índice único imovel_id+mes_referencia).
 */
function startChargeScheduler() {
  cron.schedule('0 8 1 * *', async () => {
    const now = new Date()
    const referenceMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    console.info(`[Scheduler] Iniciando geração de cobranças — ${referenceMonth}`)

    let imoveis
    try {
      const { data, error } = await supabase
        .from('imoveis')
        .select('*')
        .eq('ativo', true)
        .eq('billing_mode', 'MANUAL')

      if (error) throw error
      imoveis = data
    } catch (err) {
      console.error('[Scheduler] Falha ao buscar imóveis:', err.message)
      return
    }

    console.info(`[Scheduler] ${imoveis.length} imóvel(is) MANUAL a processar.`)

    let successCount = 0
    let errorCount   = 0

    for (const imovel of imoveis) {
      try {
        // Busca o inquilino ativo vinculado ao imóvel
        const { data: inquilino, error: tenantErr } = await supabase
          .from('inquilinos')
          .select('*')
          .eq('imovel_id', imovel.id)
          .eq('ativo', true)
          .maybeSingle()

        if (tenantErr) throw tenantErr

        if (!inquilino) {
          console.error(`[Scheduler] Inquilino não encontrado — imóvel ${imovel.id}`)
          errorCount++
          continue
        }

        await createMonthlyCharge(imovel, inquilino, referenceMonth)
        successCount++
      } catch (err) {
        errorCount++
        console.error(`[Scheduler] Erro no imóvel ${imovel.id}:`, err.message)
      }
    }

    console.info(
      `[Scheduler] ${referenceMonth} concluído — ${successCount} criadas, ${errorCount} erro(s).`
    )
  }, {
    timezone: 'America/Sao_Paulo',
  })

  console.info('[Scheduler] Agendamento de cobranças ativo (dia 1, 08:00 BRT).')
}

module.exports = { startChargeScheduler }
