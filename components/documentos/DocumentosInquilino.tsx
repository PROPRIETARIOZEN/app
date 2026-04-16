'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, FileText, ImageIcon, Trash2, Eye, Download,
  Folder, Loader2, File,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TipoDoc =
  | 'rg'
  | 'cpf'
  | 'cnh'
  | 'comprovante_renda'
  | 'comprovante_residencia'
  | 'outro'

const TIPO_LABELS: Record<TipoDoc, string> = {
  rg:                    'RG',
  cpf:                   'CPF',
  cnh:                   'CNH',
  comprovante_renda:     'Comprovante de renda',
  comprovante_residencia:'Comprovante de residência',
  outro:                 'Outro',
}

interface Documento {
  id: string
  tipo: TipoDoc
  nome_arquivo: string
  tamanho: string
  tamanho_bytes: number
  mime_type: string
  descricao: string | null
  url: string
  criado_em: string
}

interface Props {
  inquilinoId: string
  nomeInquilino: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sel =
  'h-9 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50'

function IconeArquivo({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType === 'application/pdf') return <FileText className={cn('text-red-500', className)} />
  if (mimeType.startsWith('image/')) return <ImageIcon className={cn('text-blue-500', className)} />
  return <File className={cn('text-slate-400', className)} />
}

// ─── DocList ──────────────────────────────────────────────────────────────────

function DocRow({
  doc, deletando, onDeletar,
}: { doc: Documento; deletando: string | null; onDeletar: (d: Documento) => void }) {
  return (
    <li className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
      <IconeArquivo mimeType={doc.mime_type} className="h-5 w-5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-[#0F172A] truncate leading-snug"
          title={doc.nome_arquivo}
        >
          {doc.nome_arquivo}
        </p>
        <p className="text-xs text-[#94A3B8]">{doc.tamanho}</p>
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => window.open(doc.url, '_blank')}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition-colors"
          title="Visualizar"
        >
          <Eye className="h-3.5 w-3.5" />
        </button>
        <a
          href={doc.url}
          download={doc.nome_arquivo}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] transition-colors"
          title="Baixar"
        >
          <Download className="h-3.5 w-3.5" />
        </a>
        <button
          onClick={() => onDeletar(doc)}
          disabled={deletando === doc.id}
          className="h-7 w-7 flex items-center justify-center rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-600 transition-colors disabled:opacity-40"
          title="Remover"
        >
          {deletando === doc.id
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Trash2 className="h-3.5 w-3.5" />}
        </button>
      </div>
    </li>
  )
}

function DocList({
  docs, mostrarCategoria, deletando, onDeletar,
}: {
  docs: Documento[]
  mostrarCategoria: boolean
  deletando: string | null
  onDeletar: (d: Documento) => void
}) {
  if (!mostrarCategoria) {
    return (
      <ul className="divide-y divide-[#F1F5F9]">
        {docs.map(doc => (
          <DocRow key={doc.id} doc={doc} deletando={deletando} onDeletar={onDeletar} />
        ))}
      </ul>
    )
  }
  const grupos = (Object.keys(TIPO_LABELS) as TipoDoc[])
    .map(tipo => ({ tipo, lista: docs.filter(d => d.tipo === tipo) }))
    .filter(g => g.lista.length > 0)
  return (
    <div className="space-y-4">
      {grupos.map(({ tipo, lista }) => (
        <div key={tipo}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8] mb-1.5 px-0.5">
            {TIPO_LABELS[tipo]}
          </p>
          <ul className="divide-y divide-[#F1F5F9]">
            {lista.map(doc => (
              <DocRow key={doc.id} doc={doc} deletando={deletando} onDeletar={onDeletar} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function DocumentosInquilino({ inquilinoId, nomeInquilino }: Props) {
  const [docs, setDocs]                     = useState<Documento[]>([])
  const [loading, setLoading]               = useState(true)
  const [isDragging, setIsDragging]         = useState(false)
  const [fileParaConfirmar, setFileParaConfirmar] = useState<File | null>(null)
  const [tipo, setTipo]                     = useState<TipoDoc | ''>('')
  const [descricao, setDescricao]           = useState('')
  const [uploading, setUploading]           = useState(false)
  const [progresso, setProgresso]           = useState(0)
  const [deletando, setDeletando]           = useState<string | null>(null)
  const [tabAtiva, setTabAtiva]             = useState<TipoDoc | 'todos'>('todos')
  const inputRef = useRef<HTMLInputElement>(null)

  const buscarDocs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/documentos/inquilino/${inquilinoId}`)
      if (!res.ok) throw new Error()
      const json = await res.json()
      setDocs(json.documentos ?? [])
    } catch {
      toast.error('Erro ao carregar documentos')
    } finally {
      setLoading(false)
    }
  }, [inquilinoId])

  useEffect(() => { buscarDocs() }, [buscarDocs])

  // ── Validação local do arquivo ─────────────────────────────────────────────

  function handleFileSelected(file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10 MB.')
      return
    }
    const aceitos = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    if (!aceitos.includes(file.type)) {
      toast.error('Tipo não permitido. Use PDF, JPG ou PNG.')
      return
    }
    setFileParaConfirmar(file)
    setTipo('')
    setDescricao('')
  }

  // ── Drag-and-drop ──────────────────────────────────────────────────────────

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(true)
  }

  function handleDragLeave() {
    setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFileSelected(file)
  }

  // ── Upload em 3 etapas (direto ao Supabase, sem limite do Vercel) ────────────

  async function handleUploadConfirmar() {
    if (!fileParaConfirmar || !tipo) return
    setUploading(true)
    setProgresso(0)

    try {
      // Etapa 1: obter URL assinada
      const tokenRes = await fetch(
        `/api/documentos/inquilino/${inquilinoId}/upload-token?` +
        new URLSearchParams({
          filename: fileParaConfirmar.name,
          mimeType: fileParaConfirmar.type,
          size:     String(fileParaConfirmar.size),
          tipo,
        }),
      )
      if (!tokenRes.ok) {
        const err = await tokenRes.json()
        throw new Error(err.error ?? 'Erro ao preparar upload')
      }
      const { signedUrl, path } = await tokenRes.json() as { signedUrl: string; path: string }
      setProgresso(5)

      // Etapa 2: upload direto para o Supabase Storage
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable)
            setProgresso(5 + Math.round((e.loaded / e.total) * 90))
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Falha ao enviar arquivo (${xhr.status})`))
        }
        xhr.onerror = () => reject(new Error('Erro de rede'))
        xhr.open('PUT', signedUrl)
        xhr.setRequestHeader('Content-Type', fileParaConfirmar.type)
        xhr.send(fileParaConfirmar)
      })
      setProgresso(95)

      // Etapa 3: salvar metadados
      const metaRes = await fetch(`/api/documentos/inquilino/${inquilinoId}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          path,
          tipo,
          descricao:     descricao.trim() || null,
          nome_arquivo:  fileParaConfirmar.name,
          tamanho_bytes: fileParaConfirmar.size,
          mime_type:     fileParaConfirmar.type,
        }),
      })
      if (!metaRes.ok) {
        const err = await metaRes.json()
        throw new Error(err.error ?? 'Erro ao salvar metadados')
      }
      const { documento: novoDoc } = await metaRes.json() as { documento: Documento }

      setProgresso(100)
      setDocs(prev => [novoDoc, ...prev])
      setTabAtiva(novoDoc.tipo)
      toast.success('Documento enviado com sucesso!')
      setFileParaConfirmar(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao enviar documento')
    } finally {
      setUploading(false)
      setProgresso(0)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────

  async function handleDeletar(doc: Documento) {
    if (!confirm(`Remover "${doc.nome_arquivo}"? Esta ação não pode ser desfeita.`)) return
    setDeletando(doc.id)
    try {
      const res = await fetch(
        `/api/documentos/inquilino/${inquilinoId}/${doc.id}`,
        { method: 'DELETE' },
      )
      if (!res.ok) {
        const json = await res.json()
        toast.error(json.error ?? 'Erro ao remover')
        return
      }
      setDocs(prev => {
        const nova = prev.filter(d => d.id !== doc.id)
        if (tabAtiva !== 'todos' && !nova.some(d => d.tipo === tabAtiva)) setTabAtiva('todos')
        return nova
      })
      toast.success('Documento removido')
    } catch {
      toast.error('Erro ao remover documento')
    } finally {
      setDeletando(null)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const primeiroNome = nomeInquilino.split(' ')[0]

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Zona de upload */}
        <div
          role="button"
          tabIndex={0}
          className={cn(
            'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-colors mx-4 mt-4',
            isDragging
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-[#D1D5DB] hover:border-emerald-400 hover:bg-slate-50',
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        >
          <Upload className="h-5 w-5 text-[#94A3B8] mx-auto mb-1.5" />
          <p className="text-sm font-medium text-[#475569]">
            Arraste ou{' '}
            <span className="text-emerald-600 font-semibold">clique para selecionar</span>
          </p>
          <p className="text-xs text-[#94A3B8] mt-0.5">PDF, JPG, PNG — máx. 10 MB</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFileSelected(f)
            e.target.value = ''
          }}
        />

        {/* Lista */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-[#94A3B8]" />
            </div>
          ) : docs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <Folder className="h-10 w-10 text-slate-200" />
              <p className="text-sm font-medium text-[#475569]">
                Nenhum documento de {primeiroNome} ainda
              </p>
              <p className="text-xs text-[#94A3B8]">
                Anexe RG, CPF, CNH e comprovantes para organizar o cadastro.
              </p>
            </div>
          ) : (
            <>
              {/* ── Tabs de categoria ───────────────────────────────────── */}
              <div className="flex gap-1.5 flex-wrap mb-1">
                <button
                  onClick={() => setTabAtiva('todos')}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                    tabAtiva === 'todos'
                      ? 'bg-[#0F172A] text-white border-[#0F172A]'
                      : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#475569]',
                  )}
                >
                  Todos
                  <span className={cn(
                    'rounded-full px-1 text-[10px] font-semibold',
                    tabAtiva === 'todos' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                  )}>
                    {docs.length}
                  </span>
                </button>
                {(Object.keys(TIPO_LABELS) as TipoDoc[])
                  .filter(t => docs.some(d => d.tipo === t))
                  .map(t => {
                    const count = docs.filter(d => d.tipo === t).length
                    const ativa = tabAtiva === t
                    return (
                      <button
                        key={t}
                        onClick={() => setTabAtiva(t)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors',
                          ativa
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#475569]',
                        )}
                      >
                        {TIPO_LABELS[t]}
                        <span className={cn(
                          'rounded-full px-1 text-[10px] font-semibold',
                          ativa ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500',
                        )}>
                          {count}
                        </span>
                      </button>
                    )
                  })}
              </div>

              {/* ── Lista filtrada ─────────────────────────────────────── */}
              <DocList
                docs={tabAtiva === 'todos' ? docs : docs.filter(d => d.tipo === tabAtiva)}
                mostrarCategoria={tabAtiva === 'todos'}
                deletando={deletando}
                onDeletar={handleDeletar}
              />
            </>
          )}
        </div>
      </div>

      {/* ── Modal de confirmação de upload ──────────────────────────────────── */}
      <Dialog
        open={!!fileParaConfirmar}
        onOpenChange={(o) => { if (!o && !uploading) setFileParaConfirmar(null) }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar documento</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* Prévia do arquivo */}
            <div className="flex items-center gap-3 rounded-lg bg-slate-50 border border-[#E2E8F0] px-3 py-2.5">
              <IconeArquivo mimeType={fileParaConfirmar?.type ?? ''} className="h-5 w-5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium text-[#0F172A] truncate leading-snug"
                  title={fileParaConfirmar?.name}
                >
                  {fileParaConfirmar?.name}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  {fileParaConfirmar
                    ? fileParaConfirmar.size >= 1024 * 1024
                      ? `${(fileParaConfirmar.size / (1024 * 1024)).toFixed(1)} MB`
                      : `${Math.round(fileParaConfirmar.size / 1024)} KB`
                    : ''}
                </p>
              </div>
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label htmlFor="tipo-doc-inquilino">
                Tipo de documento <span className="text-red-500">*</span>
              </Label>
              <select
                id="tipo-doc-inquilino"
                className={sel}
                value={tipo}
                onChange={(e) => setTipo(e.target.value as TipoDoc)}
              >
                <option value="" disabled>Selecione o tipo</option>
                {(Object.entries(TIPO_LABELS) as [TipoDoc, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label htmlFor="descricao-doc-inquilino">
                Descrição{' '}
                <span className="text-[#94A3B8] font-normal">(opcional)</span>
              </Label>
              <Input
                id="descricao-doc-inquilino"
                placeholder="Ex: RG frente e verso"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                maxLength={200}
              />
            </div>

            {/* Progress */}
            {uploading && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-[#64748B]">
                  <span>Enviando...</span>
                  <span>{progresso}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-150 rounded-full"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé */}
          <div className="-mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t bg-muted/50 p-4 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setFileParaConfirmar(null)}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              className="bg-[#059669] hover:bg-[#047857]"
              onClick={handleUploadConfirmar}
              disabled={!tipo || uploading}
            >
              {uploading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                : 'Enviar documento'
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
