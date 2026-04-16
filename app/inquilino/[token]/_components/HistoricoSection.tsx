'use client'

import { useState } from 'react'

type Aluguel = {
  id: string
  mes_referencia: string
  valor: number
  data_vencimento: string
  status: string
  data_pagamento: string | null
  valor_pago: number | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  pago:      { label: 'Pago',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
  pendente:  { label: 'Pendente',  bg: 'bg-amber-50',   text: 'text-amber-700' },
  atrasado:  { label: 'Atrasado',  bg: 'bg-red-50',     text: 'text-red-700' },
  cancelado: { label: 'Cancelado', bg: 'bg-gray-100',   text: 'text-gray-500' },
  estornado: { label: 'Estornado', bg: 'bg-gray-100',   text: 'text-gray-500' },
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarMes(mes: string) {
  const [ano, m] = mes.split('-')
  const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${nomes[parseInt(m, 10) - 1]} ${ano}`
}

function formatarData(data: string) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}

const PAGE_SIZE = 6

export default function HistoricoSection({ historico }: { historico: Aluguel[] }) {
  const [expandido, setExpandido] = useState(false)
  const visivel = expandido ? historico : historico.slice(0, PAGE_SIZE)
  const temMais = historico.length > PAGE_SIZE

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Histórico de pagamentos</h2>
      {historico.length === 0 ? (
        <p className="text-sm text-gray-400">Nenhum registro encontrado.</p>
      ) : (
        <>
          <div className="space-y-2">
            {visivel.map(a => {
              const cfg = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.cancelado
              return (
                <div key={a.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatarMes(a.mes_referencia)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Venc. {formatarData(a.data_vencimento)}
                      {a.data_pagamento && ` · Pago em ${formatarData(a.data_pagamento)}`}
                    </p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                      {cfg.label}
                    </span>
                    <span className="text-sm font-semibold text-gray-700">
                      {formatarMoeda(a.valor_pago ?? a.valor)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          {temMais && (
            <button
              onClick={() => setExpandido(v => !v)}
              className="mt-3 text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
            >
              {expandido ? 'Ver menos' : `Ver mais ${historico.length - PAGE_SIZE} registros`}
            </button>
          )}
        </>
      )}
    </section>
  )
}
