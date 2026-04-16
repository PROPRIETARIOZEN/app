'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { criarImovel, editarImovel } from '@/app/(dashboard)/imoveis/actions'
import type { Imovel } from '@/types'
import { cn } from '@/lib/utils'

// ─── Helpers de vigência ──────────────────────────────────────────────────────

function calcularDataFim(inicio: string, meses: number): string {
  const d = new Date(inicio + 'T00:00:00')
  d.setMonth(d.getMonth() + meses)
  return d.toISOString().split('T')[0]
}

function formatarDataLonga(dataStr: string): string {
  return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    .format(new Date(dataStr + 'T00:00:00'))
}

function diasEntre(dataStr: string): number {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(dataStr + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

const sel = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"

// Usa z.string() para campos numéricos (HTML inputs retornam string)
// e converte manualmente no onSubmit — compatível com Zod v4 + react-hook-form
const schema = z.object({
  apelido: z.string().min(1, 'Obrigatório'),
  endereco: z.string().min(1, 'Obrigatório'),
  tipo: z.enum(['apartamento', 'casa', 'kitnet', 'comercial', 'terreno', 'outro']),
  valor_aluguel: z.string().refine(v => v.length > 0 && !isNaN(Number(v)) && Number(v) > 0, 'Deve ser maior que zero'),
  dia_vencimento: z.string().refine(v => {
    const n = Number(v)
    return Number.isInteger(n) && n >= 1 && n <= 31
  }, 'Deve ser entre 1 e 31'),
  data_inicio_contrato: z.string().optional(),
  data_proximo_reajuste: z.string().optional(),
  indice_reajuste: z.enum(['igpm', 'ipca', 'fixo']),
  percentual_fixo: z.string().optional(),
  observacoes: z.string().optional(),
}).superRefine((d, ctx) => {
  if (d.indice_reajuste === 'fixo') {
    const v = Number(d.percentual_fixo)
    if (!d.percentual_fixo || isNaN(v) || v <= 0) {
      ctx.addIssue({ code: 'custom', message: 'Informe o percentual fixo', path: ['percentual_fixo'] })
    }
  }
})

type FormData = z.infer<typeof schema>

interface ImovelModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imovel: Imovel | null
}

export function ImovelModal({ open, onOpenChange, imovel }: ImovelModalProps) {
  const [loading, setLoading] = useState(false)
  const [vigenciaMeses, setVigenciaMeses] = useState<number | null>(null)
  const editando = !!imovel

  const hoje = new Date().toISOString().split('T')[0]

  const { register, handleSubmit, watch, reset, setError, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { indice_reajuste: 'fixo', tipo: 'apartamento', dia_vencimento: '10' },
  })

  const indice = watch('indice_reajuste')

  useEffect(() => {
    if (!open) return
    if (imovel) {
      reset({
        apelido: imovel.apelido,
        endereco: imovel.endereco,
        tipo: imovel.tipo,
        valor_aluguel: String(imovel.valor_aluguel),
        dia_vencimento: String(imovel.dia_vencimento),
        data_inicio_contrato: imovel.data_inicio_contrato ?? '',
        data_proximo_reajuste: imovel.data_proximo_reajuste ?? '',
        indice_reajuste: imovel.indice_reajuste,
        percentual_fixo: imovel.percentual_fixo != null ? String(imovel.percentual_fixo) : '',
        observacoes: imovel.observacoes ?? '',
      })
      // Pre-fill vigência
      if (imovel.data_fim_contrato && imovel.data_inicio_contrato) {
        const inicio = new Date(imovel.data_inicio_contrato + 'T00:00:00')
        const fim = new Date(imovel.data_fim_contrato + 'T00:00:00')
        const meses = Math.round((fim.getTime() - inicio.getTime()) / (30 * 86_400_000))
        const opcao = [12, 24, 30, 36].includes(meses) ? meses : null
        setVigenciaMeses(opcao)
      } else if (imovel.contrato_indeterminado) {
        setVigenciaMeses(null)
      } else {
        setVigenciaMeses(null)
      }
    } else {
      reset({
        apelido: '', endereco: '', tipo: 'apartamento',
        valor_aluguel: '', dia_vencimento: '10',
        data_inicio_contrato: '', data_proximo_reajuste: '',
        indice_reajuste: 'fixo', percentual_fixo: '', observacoes: '',
      })
      setVigenciaMeses(null)
    }
  }, [open, imovel, reset])

  async function onSubmit(data: FormData) {
    if (!editando && data.data_inicio_contrato && data.data_inicio_contrato < hoje) {
      setError('data_inicio_contrato', { message: 'A data de início não pode ser no passado' })
      return
    }
    setLoading(true)
    try {
      // Vigência
      const dataFimContrato = vigenciaMeses != null && data.data_inicio_contrato
        ? calcularDataFim(data.data_inicio_contrato, vigenciaMeses)
        : null
      const input = {
        apelido: data.apelido,
        endereco: data.endereco,
        tipo: data.tipo,
        valor_aluguel: Number(data.valor_aluguel),
        dia_vencimento: Number(data.dia_vencimento),
        data_inicio_contrato: data.data_inicio_contrato || null,
        data_proximo_reajuste: data.data_proximo_reajuste || null,
        indice_reajuste: data.indice_reajuste,
        percentual_fixo: data.indice_reajuste === 'fixo' && data.percentual_fixo
          ? Number(data.percentual_fixo)
          : null,
        observacoes: data.observacoes || null,
        vigencia_meses: vigenciaMeses,
        data_fim_contrato: dataFimContrato,
        contrato_indeterminado: vigenciaMeses === null,
        alerta_vencimento_enviado: false,
      }
      const result = editando
        ? await editarImovel(imovel!.id, input)
        : await criarImovel(input)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(editando ? 'Imóvel atualizado!' : 'Imóvel cadastrado!')
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="sm:max-w-xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar imóvel' : 'Novo imóvel'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="apelido">Apelido / nome do imóvel</Label>
            <Input id="apelido" placeholder="Ex: Apto Centro, Casa Verde" {...register('apelido')} />
            {errors.apelido && <p className="text-destructive text-xs">{errors.apelido.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endereco">Endereço completo</Label>
            <Input id="endereco" placeholder="Rua, número, bairro, cidade" {...register('endereco')} />
            {errors.endereco && <p className="text-destructive text-xs">{errors.endereco.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo</Label>
              <select id="tipo" className={sel} {...register('tipo')}>
                <option value="apartamento">Apartamento</option>
                <option value="casa">Casa</option>
                <option value="kitnet">Kitnet</option>
                <option value="comercial">Comercial</option>
                <option value="terreno">Terreno</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="valor_aluguel">Valor do aluguel (R$)</Label>
              <Input id="valor_aluguel" type="number" step="0.01" placeholder="1500.00" {...register('valor_aluguel')} />
              {errors.valor_aluguel && <p className="text-destructive text-xs">{errors.valor_aluguel.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dia_vencimento">Dia de vencimento</Label>
              <Input id="dia_vencimento" type="number" min={1} max={31} placeholder="10" {...register('dia_vencimento')} />
              {errors.dia_vencimento && <p className="text-destructive text-xs">{errors.dia_vencimento.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="indice_reajuste">Índice de reajuste</Label>
              <select id="indice_reajuste" className={sel} {...register('indice_reajuste')}>
                <option value="fixo">Percentual fixo</option>
                <option value="igpm">IGPM</option>
                <option value="ipca">IPCA</option>
              </select>
            </div>
          </div>

          {indice === 'fixo' && (
            <div className="space-y-1.5">
              <Label htmlFor="percentual_fixo">Percentual fixo (%)</Label>
              <Input id="percentual_fixo" type="number" step="0.01" placeholder="3.00" {...register('percentual_fixo')} />
              {errors.percentual_fixo && <p className="text-destructive text-xs">{errors.percentual_fixo.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="data_inicio_contrato">Início do contrato</Label>
              <Input
                id="data_inicio_contrato"
                type="date"
                min={!editando ? hoje : undefined}
                {...register('data_inicio_contrato')}
              />
              {errors.data_inicio_contrato && (
                <p className="text-destructive text-xs">{errors.data_inicio_contrato.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_proximo_reajuste">Próximo reajuste</Label>
              <Input id="data_proximo_reajuste" type="date" {...register('data_proximo_reajuste')} />
            </div>
          </div>

          {/* ── Duração do contrato ──────────────────────────────────────────── */}
          <div className="space-y-3">
            <Label>Duração do contrato</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { value: 12,   label: '12 meses',  sub: '1 ano' },
                { value: 24,   label: '24 meses',  sub: '2 anos' },
                { value: 30,   label: '30 meses',  sub: '2,5 anos — padrão BR' },
                { value: 36,   label: '36 meses',  sub: '3 anos' },
                { value: null, label: 'Indeterminado', sub: 'Sem data fim' },
              ].map(op => (
                <button
                  key={String(op.value)}
                  type="button"
                  onClick={() => setVigenciaMeses(op.value)}
                  className={cn(
                    'rounded-lg border px-3 py-2.5 text-left transition-colors',
                    vigenciaMeses === op.value
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-400'
                      : 'border-slate-200 hover:border-slate-300 bg-white',
                  )}
                >
                  <p className={cn('text-sm font-semibold leading-tight', vigenciaMeses === op.value ? 'text-emerald-700' : 'text-slate-700')}>
                    {op.label}
                  </p>
                  {op.sub && <p className={cn('text-xs leading-tight mt-0.5', vigenciaMeses === op.value ? 'text-emerald-500' : 'text-slate-400')}>{op.sub}</p>}
                </button>
              ))}
            </div>

            {/* Preview card */}
            {(() => {
              const inicioVal = watch('data_inicio_contrato')
              if (!inicioVal) return null
              if (vigenciaMeses === null) {
                return (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-500 italic">
                    Contrato sem data de encerramento
                  </div>
                )
              }
              const dataFim = calcularDataFim(inicioVal, vigenciaMeses)
              const dias = diasEntre(dataFim)
              const vencido = dias < 0
              return (
                <div className={cn(
                  'rounded-lg border px-3.5 py-2.5 space-y-1',
                  vencido ? 'border-red-200 bg-red-50' : 'border-emerald-200 bg-emerald-50',
                )}>
                  <p className={cn('text-xs font-medium', vencido ? 'text-red-700' : 'text-emerald-700')}>
                    {vencido
                      ? `Contrato vencido em ${formatarDataLonga(dataFim)}. Renove ou atualize.`
                      : `Contrato válido de ${formatarDataLonga(inicioVal)} até ${formatarDataLonga(dataFim)}`
                    }
                  </p>
                  <p className={cn('text-xs', vencido ? 'text-red-500' : 'text-emerald-600')}>
                    {vencido
                      ? `Vencido há ${Math.abs(dias)} dia${Math.abs(dias) !== 1 ? 's' : ''}`
                      : dias <= 60
                        ? `Vence em ${dias} dia${dias !== 1 ? 's' : ''}`
                        : `${Math.round(dias / 30)} meses restantes`
                    }
                  </p>
                </div>
              )
            })()}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea id="observacoes" placeholder="Informações adicionais sobre o imóvel..." {...register('observacoes')} />
          </div>

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editando ? 'Salvar alterações' : 'Cadastrar imóvel'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
