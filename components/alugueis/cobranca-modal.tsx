'use client'

import { useState, useEffect } from 'react'
import { X, Copy, ExternalLink, Zap, Loader2, QrCode, KeyRound, Settings, Mail } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatarMoeda } from '@/lib/helpers'
import { gerarPayloadPix } from '@/lib/pix'
import type { AluguelItem } from './alugueis-client'

// ─── helpers ──────────────────────────────────────────────────────────────────

const PIX_TIPO_LABEL: Record<string, string> = {
  cpf:       'CPF',
  cnpj:      'CNPJ',
  email:     'E-mail',
  telefone:  'Telefone',
  aleatoria: 'Chave aleatória',
}

function labelMes(ref: string): string {
  const [ano, mes] = ref.split('-').map(Number)
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function formatarDataCurta(data: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
    .format(new Date(data + 'T00:00:00'))
    .replace('.', '')
}

function copiar(texto: string, label: string) {
  navigator.clipboard.writeText(texto)
    .then(() => toast.success(`${label} copiado!`))
    .catch(() => toast.error('Não foi possível copiar.'))
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  aluguel: AluguelItem
  pixKey: string | null
  pixKeyTipo: string | null
  nomeProprietario: string
  open: boolean
  onClose: () => void
  loadingCobranca: boolean
  loadingEmail: boolean
  onGerarCobranca: () => void
  onCancelarCobranca: () => void
  onRegistrarPagamento: () => void
  onEnviarEmail: () => void
}

// ─── Seções por cenário ────────────────────────────────────────────────────────

function SecaoAutoSemCharge({ loading, onGerar }: { loading: boolean; onGerar: () => void }) {
  return (
    <div className="space-y-4 py-2">
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Zap className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800 space-y-1">
          <p className="font-medium">Cobrança automática via Asaas</p>
          <p className="text-amber-700 text-xs leading-relaxed">
            Ao gerar a cobrança, o inquilino receberá um PIX e boleto para pagamento.
            Os dados serão atualizados automaticamente via webhook.
          </p>
        </div>
      </div>
      <Button
        className="w-full bg-emerald-600 hover:bg-emerald-700 gap-2"
        onClick={onGerar}
        disabled={loading}
      >
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin" />
          : <QrCode className="h-4 w-4" />}
        Gerar PIX + Boleto via Asaas
      </Button>
    </div>
  )
}

function SecaoAutoComCharge({ aluguel, loading, loadingEmail, inquilinoEmail, onCancelar, onEnviarEmail }: {
  aluguel: AluguelItem
  loading: boolean
  loadingEmail: boolean
  inquilinoEmail: string | null
  onCancelar: () => void
  onEnviarEmail: () => void
}) {
  return (
    <div className="space-y-4 py-2">
      {/* QR Code PIX */}
      {aluguel.asaas_pix_qrcode && (
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/png;base64,${aluguel.asaas_pix_qrcode}`}
            alt="QR Code PIX"
            className="h-52 w-52 rounded-xl border border-slate-200 p-2 bg-white"
          />
        </div>
      )}

      {/* Copia e cola */}
      {aluguel.asaas_pix_copiaecola && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">PIX Copia e Cola</p>
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 break-all text-xs font-mono text-slate-600 select-all leading-relaxed">
            {aluguel.asaas_pix_copiaecola}
          </div>
          <Button
            className="w-full gap-2"
            onClick={() => copiar(aluguel.asaas_pix_copiaecola!, 'Código PIX')}
          >
            <Copy className="h-4 w-4" />
            Copiar código PIX
          </Button>
        </div>
      )}

      {/* Boleto */}
      {aluguel.asaas_boleto_url && (
        <a
          href={aluguel.asaas_boleto_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 w-full rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 text-sm font-medium py-2.5 transition-colors"
        >
          <ExternalLink className="h-4 w-4" />
          Ver boleto bancário
        </a>
      )}

      {/* Enviar por e-mail */}
      {inquilinoEmail ? (
        <Button
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={onEnviarEmail}
          disabled={loadingEmail}
        >
          {loadingEmail
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Mail className="h-4 w-4" />}
          Enviar para {inquilinoEmail}
        </Button>
      ) : null}

      {/* Cancelar */}
      <button
        onClick={onCancelar}
        disabled={loading}
        className="w-full text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1 py-1"
      >
        {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
        Cancelar esta cobrança
      </button>
    </div>
  )
}

function SecaoManualComPix({
  pixKey,
  pixKeyTipo,
  nomeProprietario,
  valor,
  inquilinoEmail,
  loadingEmail,
  onRegistrar,
  onEnviarEmail,
}: {
  pixKey: string
  pixKeyTipo: string | null
  nomeProprietario: string
  valor: number
  inquilinoEmail: string | null
  loadingEmail: boolean
  onRegistrar: () => void
  onEnviarEmail: () => void
}) {
  const tipoLabel = pixKeyTipo ? (PIX_TIPO_LABEL[pixKeyTipo] ?? pixKeyTipo) : 'PIX'
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!pixKey) return
    const payload = gerarPayloadPix({ chave: pixKey, nomeRecebedor: nomeProprietario, valor })
    import('qrcode').then(mod => {
      mod.default.toDataURL(payload, { width: 200, margin: 2 })
        .then(url => setQrDataUrl(url))
        .catch(() => setQrDataUrl(null))
    })
  }, [pixKey, nomeProprietario, valor])

  return (
    <div className="space-y-4 py-2">
      {/* Título da seção */}
      <p className="text-sm font-semibold text-slate-700">Envie o Pix para o inquilino</p>

      {/* QR Code + valor */}
      {qrDataUrl && (
        <div className="flex flex-col items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt="QR Code PIX"
            className="h-44 w-44 rounded-xl border border-slate-200 p-2 bg-white"
          />
          <p className="text-lg font-bold text-slate-900">{formatarMoeda(valor)}</p>
        </div>
      )}

      {/* Chave PIX */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold text-emerald-800">Instrução de pagamento</p>
        </div>
        <div>
          <p className="text-xs text-emerald-700 mb-1">{tipoLabel}</p>
          <p className="text-base font-mono font-semibold text-emerald-900 break-all">{pixKey}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100"
          onClick={() => copiar(pixKey, 'Chave PIX')}
        >
          <Copy className="h-3.5 w-3.5" />
          Copiar chave PIX
        </Button>
      </div>

      {/* Enviar por e-mail */}
      {inquilinoEmail ? (
        <Button
          className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
          onClick={onEnviarEmail}
          disabled={loadingEmail}
        >
          {loadingEmail
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Mail className="h-4 w-4" />}
          Enviar por e-mail para {inquilinoEmail}
        </Button>
      ) : (
        <Button
          variant="outline"
          className="w-full gap-2 text-slate-400"
          disabled
          title="Cadastre o e-mail do inquilino para enviar"
        >
          <Mail className="h-4 w-4" />
          Enviar por e-mail
        </Button>
      )}

      {/* Rodapé */}
      <Button variant="ghost" className="w-full gap-2 text-slate-500 text-sm" onClick={onRegistrar}>
        Registrar pagamento manual
      </Button>
    </div>
  )
}

function SecaoManualSemPix({ onRegistrar }: { onRegistrar: () => void }) {
  return (
    <div className="space-y-4 py-2">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col items-center gap-3 text-center">
        <div className="p-2 rounded-full bg-slate-100">
          <KeyRound className="h-5 w-5 text-slate-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">Nenhuma chave PIX configurada</p>
          <p className="text-xs text-slate-500 leading-relaxed max-w-xs">
            Configure sua chave PIX em Configurações para enviar instruções de pagamento
            diretamente aos inquilinos.
          </p>
        </div>
        <Link
          href="/configuracoes#perfil"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 hover:underline"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurar chave PIX
        </Link>
      </div>

      <Button className="w-full gap-2" onClick={onRegistrar}>
        Registrar pagamento manualmente
      </Button>
    </div>
  )
}

// ─── Modal principal ───────────────────────────────────────────────────────────

export function CobrancaModal({
  aluguel,
  pixKey,
  pixKeyTipo,
  nomeProprietario,
  open,
  onClose,
  loadingCobranca,
  loadingEmail,
  onGerarCobranca,
  onCancelarCobranca,
  onRegistrarPagamento,
  onEnviarEmail,
}: Props) {
  if (!open) return null

  const isAutomatic = aluguel.imovel?.billing_mode === 'AUTOMATIC'
  const temCharge = !!aluguel.asaas_charge_id
  const inquilinoEmail = aluguel.inquilino?.email ?? null
  const valorEfetivo = aluguel.valor - (aluguel.desconto ?? 0)

  function renderContent() {
    if (isAutomatic) {
      if (!temCharge) {
        return (
          <SecaoAutoSemCharge
            loading={loadingCobranca}
            onGerar={onGerarCobranca}
          />
        )
      }
      return (
        <SecaoAutoComCharge
          aluguel={aluguel}
          loading={loadingCobranca}
          loadingEmail={loadingEmail}
          inquilinoEmail={inquilinoEmail}
          onCancelar={onCancelarCobranca}
          onEnviarEmail={onEnviarEmail}
        />
      )
    }

    // MANUAL
    if (pixKey) {
      return (
        <SecaoManualComPix
          pixKey={pixKey}
          pixKeyTipo={pixKeyTipo}
          nomeProprietario={nomeProprietario}
          valor={valorEfetivo}
          inquilinoEmail={inquilinoEmail}
          loadingEmail={loadingEmail}
          onRegistrar={onRegistrarPagamento}
          onEnviarEmail={onEnviarEmail}
        />
      )
    }

    return <SecaoManualSemPix onRegistrar={onRegistrarPagamento} />
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="space-y-0.5 min-w-0 pr-4">
            <p className="text-base font-bold text-slate-900">
              Cobrar aluguel{aluguel.inquilino?.nome ? ` de ${aluguel.inquilino.nome}` : ''}
            </p>
            <p className="text-xs text-slate-500">
              {aluguel.imovel?.apelido ?? '—'} · {labelMes(aluguel.mes_referencia)} · {formatarMoeda(aluguel.valor)}
            </p>
            <p className="text-xs text-slate-400">
              Vence {formatarDataCurta(aluguel.data_vencimento)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className={cn('px-5 pb-5 overflow-y-auto', isAutomatic && temCharge && aluguel.asaas_pix_qrcode ? '' : '')}>
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
