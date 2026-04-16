/**
 * Gerador de payload PIX estático (EMV QR Code)
 * Referência: Manual de Padrões para Iniciação do PIX — Banco Central do Brasil
 * https://www.bcb.gov.br/content/estabilidadefinanceira/forumpirex/PayloadQRCodePIX.pdf
 */

function campo(id: string, valor: string): string {
  return `${id}${valor.length.toString().padStart(2, '0')}${valor}`
}

function crc16ccitt(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

function sanitizarNome(str: string, maxLen: number): string {
  const sanitizado = str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // remove acentos
    .replace(/[^a-zA-Z0-9 ]/g, ' ')   // substitui especiais por espaço
    .replace(/\s+/g, ' ')             // colapsa espaços múltiplos
    .trim()
    .slice(0, maxLen)
  return sanitizado || 'PROPRIETARIO'
}

export interface GerarPayloadPixParams {
  chave: string
  nomeRecebedor: string
  cidade?: string
  valor?: number
  txid?: string
}

export function gerarPayloadPix({
  chave,
  nomeRecebedor,
  cidade = 'Brasil',
  valor,
  txid = '***',
}: GerarPayloadPixParams): string {
  // ID 26 — Merchant Account Information (PIX)
  const merchantInfo = campo('26',
    campo('00', 'BR.GOV.BCB.PIX') +
    campo('01', chave),
  )

  // ID 62 — Additional Data Field (txid)
  const txidSanitizado = txid.replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***'
  const additionalData = campo('62', campo('05', txidSanitizado))

  const nome   = sanitizarNome(nomeRecebedor, 25)
  const cidade_ = sanitizarNome(cidade, 15)

  const partes: string[] = [
    campo('00', '01'),        // Payload Format Indicator
    merchantInfo,             // Merchant Account Information
    campo('52', '0000'),      // Merchant Category Code
    campo('53', '986'),       // Transaction Currency — BRL
  ]

  if (valor !== undefined && valor > 0) {
    partes.push(campo('54', valor.toFixed(2)))
  }

  partes.push(
    campo('58', 'BR'),    // Country Code
    campo('59', nome),    // Merchant Name
    campo('60', cidade_), // Merchant City
    additionalData,
    '6304',               // CRC placeholder
  )

  const payload = partes.join('')
  return payload + crc16ccitt(payload)
}
