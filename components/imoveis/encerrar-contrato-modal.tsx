'use client'

import { useState } from 'react'
import { Loader2, LogOut, Trash2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { encerrarContrato } from '@/app/(dashboard)/imoveis/actions'
import type { Imovel } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mesAtualYYYYMM(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function labelMes(yyyyMM: string): string {
  if (!yyyyMM) return ''
  const [ano, mes] = yyyyMM.split('-').map(Number)
  const s = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(ano, mes - 1, 1))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  imovel: Imovel | null
  open: boolean
  onClose: () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EncerrarContratoModal({ imovel, open, onClose }: Props) {
  const [ultimoMes, setUltimoMes] = useState(mesAtualYYYYMM)
  const [desativarInquilino, setDesativarInquilino] = useState(true)
  const [arquivar, setArquivar] = useState(false)
  const [loading, setLoading] = useState(false)

  if (!open || !imovel) return null

  async function handleConfirmar() {
    if (!imovel) return
    if (!ultimoMes) { toast.error('Selecione o último mês de cobrança'); return }

    setLoading(true)
    try {
      const result = await encerrarContrato(imovel.id, ultimoMes, {
        desativarInquilino,
        arquivarImovel: arquivar,
      })
      if (result.error) {
        toast.error(result.error)
        return
      }
      const msg = result.removidos === 0
        ? 'Contrato encerrado. Nenhuma cobrança futura encontrada.'
        : `Contrato encerrado. ${result.removidos} cobrança${result.removidos !== 1 ? 's' : ''} futura${result.removidos !== 1 ? 's' : ''} removida${result.removidos !== 1 ? 's' : ''}.`
      toast.success(msg)
      onClose()
    } catch {
      toast.error('Erro ao encerrar contrato')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-slate-100">
          <div className="p-2 rounded-full bg-red-50 shrink-0">
            <LogOut className="h-4 w-4 text-red-500" />
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-slate-900">Encerrar contrato</p>
            <p className="text-xs text-slate-500 truncate">{imovel.apelido}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-5">
          {/* Aviso */}
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Todas as cobranças <strong>pendentes e atrasadas</strong> após o último mês
              selecionado serão <strong>removidas permanentemente</strong>.
              Os pagamentos já registrados não serão afetados.
            </p>
          </div>

          {/* Último mês */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Último mês de cobrança
            </label>
            <input
              type="month"
              value={ultimoMes}
              onChange={e => setUltimoMes(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {ultimoMes && (
              <p className="text-xs text-slate-500">
                Cobranças de <span className="font-medium">{labelMes(ultimoMes)}</span> em
                diante (exceto pagas) serão removidas.
              </p>
            )}
          </div>

          {/* Opções adicionais */}
          <div className="space-y-2.5">
            <p className="text-sm font-semibold text-slate-700">Ações adicionais</p>

            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={desativarInquilino}
                onChange={e => setDesativarInquilino(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
              />
              <div>
                <p className="text-sm font-medium text-slate-700 leading-tight">
                  Desativar inquilino
                </p>
                <p className="text-xs text-slate-400 leading-tight mt-0.5">
                  O inquilino não gerará novas cobranças automáticas
                </p>
              </div>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={arquivar}
                onChange={e => setArquivar(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-emerald-600 cursor-pointer"
              />
              <div>
                <p className="text-sm font-medium text-slate-700 leading-tight">
                  Arquivar imóvel
                </p>
                <p className="text-xs text-slate-400 leading-tight mt-0.5">
                  O imóvel ficará inativo e não aparecerá nos relatórios ativos
                </p>
              </div>
            </label>
          </div>

          {/* Botões */}
          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full gap-2 bg-red-600 hover:bg-red-700"
              onClick={handleConfirmar}
              disabled={loading || !ultimoMes}
            >
              {loading
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Trash2 className="h-4 w-4" />}
              Confirmar encerramento
            </Button>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
