'use strict'

require('dotenv').config()
const crypto = require('crypto')
const { rootClient, createClient } = require('./asaasClient')
const { AsaasIntegrationError } = require('./AsaasIntegrationError')
const supabase = require('../../lib/supabase')

// ── Constantes de criptografia ────────────────────────────────────────────────
const CIPHER_ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

/**
 * Retorna a chave de criptografia como Buffer de 32 bytes a partir
 * de ASAAS_ENCRYPTION_KEY (64 chars hex).
 */
function getEncryptionKey() {
  const keyHex = process.env.ASAAS_ENCRYPTION_KEY
  if (!keyHex || keyHex.length !== 64) {
    throw new Error(
      'ASAAS_ENCRYPTION_KEY inválida. ' +
      'Deve ser uma string hexadecimal de 64 caracteres (32 bytes).',
    )
  }
  return Buffer.from(keyHex, 'hex')
}

/**
 * Criptografa uma string com AES-256-GCM.
 * Retorna: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 *
 * @param {string} plaintext
 * @returns {string}
 */
function encryptApiKey(plaintext) {
  const key = getEncryptionKey()
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv)

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

/**
 * Descriptografa uma string produzida por encryptApiKey.
 *
 * @param {string} encryptedText  Formato: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * @returns {string}
 */
function decryptApiKey(encryptedText) {
  const parts = encryptedText.split(':')
  if (parts.length !== 3) {
    throw new Error('Formato do apiKey criptografado inválido.')
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const key = getEncryptionKey()
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8')
}

// ── Funções exportadas ────────────────────────────────────────────────────────

/**
 * Cria uma subconta Asaas para o proprietário e persiste no banco.
 *
 * ATENÇÃO: a apiKey é retornada UMA ÚNICA VEZ pelo Asaas.
 * O save no banco é garantido ANTES de qualquer outro processamento.
 *
 * @param {string} userId  UUID do proprietário (profiles.id)
 * @param {Object} data    Dados do proprietário
 * @returns {Promise<{ asaasId: string, walletId: string, accountStatus: string }>}
 * @throws {AsaasIntegrationError}
 */
async function createSubAccount(userId, data) {
  // ── 1. Verificar duplicata ────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('asaas_account_id')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.asaas_account_id) {
    throw new AsaasIntegrationError(
      'Este proprietário já possui uma conta Asaas vinculada.',
      409,
      'accountAlreadyLinked',
    )
  }

  // ── 2. Montar payload para o Asaas ───────────────────────────────────────
  const payload = {
    name:        data.name,
    email:       data.email,
    cpfCnpj:     data.cpfCnpj,
    birthDate:   data.birthDate ?? undefined,
    phone:       data.phone ?? undefined,
    mobilePhone: data.mobilePhone,
    address:     data.address,
    addressNumber: data.addressNumber,
    province:    data.province,
    postalCode:  data.postalCode,
    companyType: data.companyType ?? undefined,
  }

  // ── 3. Chamar POST /accounts ──────────────────────────────────────────────
  const response = await rootClient.post('/accounts', payload)
  const { id: asaasId, apiKey: rawApiKey, walletId } = response.data

  if (!asaasId || !rawApiKey) {
    throw new AsaasIntegrationError(
      'Resposta inesperada do Asaas: id ou apiKey ausentes.',
      500,
      'unexpectedResponse',
    )
  }

  // ── 4. Criptografar a apiKey ANTES de qualquer outro processamento ────────
  const encryptedApiKey = encryptApiKey(rawApiKey)

  // ── 5. Persistir no banco ─────────────────────────────────────────────────
  try {
    const { error: dbError } = await supabase
      .from('profiles')
      .update({
        asaas_account_id:     asaasId,
        asaas_api_key_enc:    encryptedApiKey,
        asaas_wallet_id:      walletId ?? null,
        asaas_account_status: 'PENDING',
      })
      .eq('id', userId)

    if (dbError) throw dbError
  } catch (dbErr) {
    console.error(
      '[Asaas] CRÍTICO: subconta criada mas falhou ao persistir no banco. ' +
      `asaasId=${asaasId} userId=${userId}`,
      dbErr.message,
    )
    throw new AsaasIntegrationError(
      'Conta criada no Asaas mas falhou ao salvar no banco. ' +
      'Contate o suporte com o asaasId para recuperação manual.',
      500,
      'dbSaveFailed',
    )
  }

  return {
    asaasId,
    walletId: walletId ?? null,
    accountStatus: 'PENDING',
  }
}

/**
 * Consulta o status atual da subconta no Asaas.
 *
 * @param {string} userId  UUID do proprietário
 * @returns {Promise<{ commercialInfoStatus: string, accountStatus: string }>}
 */
async function getAccountStatus(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('asaas_account_id, asaas_api_key_enc, asaas_account_status')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.asaas_account_id) {
    throw new AsaasIntegrationError(
      'Nenhuma conta Asaas vinculada para este usuário.',
      404,
      'accountNotFound',
    )
  }

  const decryptedKey = decryptApiKey(profile.asaas_api_key_enc)
  const subClient = createClient(decryptedKey)

  const response = await subClient.get('/myAccount/status')
  const { commercialInfoStatus, accountStatus } = response.data

  if (accountStatus && profile.asaas_account_status !== accountStatus) {
    await supabase
      .from('profiles')
      .update({ asaas_account_status: accountStatus })
      .eq('id', userId)
  }

  return { commercialInfoStatus, accountStatus }
}

/**
 * Retorna a apiKey descriptografada de uma subconta.
 * Uso interno — NÃO expor via API REST.
 *
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getDecryptedApiKey(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('asaas_api_key_enc')
    .eq('id', userId)
    .maybeSingle()

  if (!profile?.asaas_api_key_enc) {
    throw new AsaasIntegrationError(
      'Conta Asaas não encontrada para este usuário.',
      404,
      'accountNotFound',
    )
  }

  return decryptApiKey(profile.asaas_api_key_enc)
}

module.exports = {
  createSubAccount,
  getAccountStatus,
  getDecryptedApiKey,
  encryptApiKey,
  decryptApiKey,
}
