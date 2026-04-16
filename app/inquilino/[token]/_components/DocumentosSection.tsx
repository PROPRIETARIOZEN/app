'use client'

import { useState } from 'react'

type Documento = {
  id: string
  tipo: string
  nome_arquivo: string
  tamanho_bytes: number
  mime_type: string
  descricao: string | null
  criado_em: string
}

const TIPO_LABELS: Record<string, string> = {
  rg:                    'RG',
  cpf:                   'CPF',
  cnh:                   'CNH',
  comprovante_renda:     'Comp. de Renda',
  comprovante_residencia:'Comp. de Residência',
  outro:                 'Outro',
}

function formatarTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function DocIcon({ mime }: { mime: string }) {
  const isPdf = mime === 'application/pdf'
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isPdf ? 'bg-red-50' : 'bg-blue-50'}`}>
      {isPdf ? (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM9.5 14.5h-.75V16H8v-4h1.5c.83 0 1.5.67 1.5 1.5S10.33 14.5 9.5 14.5zm4.5 1.5h-1.5V12H14c1.1 0 2 .9 2 2s-.9 2-2 2zm4-3h-1v1h1v.75h-1V17h-.75v-4H18v.75z"/>
        </svg>
      ) : (
        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )}
    </div>
  )
}

export default function DocumentosSection({
  documentos,
  token,
}: {
  documentos: Documento[]
  token: string
}) {
  const [loading, setLoading] = useState<string | null>(null)

  async function abrirDocumento(docId: string) {
    setLoading(docId)
    try {
      const res = await fetch(`/api/inquilino/documento/${token}/${docId}`)
      if (!res.ok) { alert('Não foi possível abrir o documento.'); return }
      const { url } = await res.json()
      window.open(url, '_blank', 'noopener,noreferrer')
    } finally {
      setLoading(null)
    }
  }

  if (documentos.length === 0) {
    return (
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Documentos</h2>
        <p className="text-sm text-gray-400">Nenhum documento disponível.</p>
      </section>
    )
  }

  return (
    <section>
      <h2 className="text-base font-semibold text-gray-900 mb-3">Documentos</h2>
      <div className="space-y-2">
        {documentos.map(doc => (
          <button
            key={doc.id}
            onClick={() => abrirDocumento(doc.id)}
            disabled={loading === doc.id}
            className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors text-left disabled:opacity-60"
          >
            <DocIcon mime={doc.mime_type} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate" title={doc.nome_arquivo}>
                {doc.nome_arquivo}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {TIPO_LABELS[doc.tipo] ?? doc.tipo} · {formatarTamanho(doc.tamanho_bytes)}
              </p>
            </div>
            {loading === doc.id ? (
              <svg className="w-4 h-4 text-gray-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </section>
  )
}
