'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Loader2, Zap } from 'lucide-react'
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
  billing_mode: z.enum(['MANUAL', 'AUTOMATIC']),
  multa_percentual: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Inválido'),
  juros_percentual: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Inválido'),
  desconto_percentual: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Inválido'),
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
  const editando = !!imovel

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { indice_reajuste: 'fixo', tipo: 'apartamento', dia_vencimento: '10' },
  })

  const indice = watch('indice_reajuste')
  const billingMode = watch('billing_mode')

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
        billing_mode: imovel.billing_mode ?? 'MANUAL',
        multa_percentual: String(imovel.multa_percentual ?? 2),
        juros_percentual: String(imovel.juros_percentual ?? 1),
        desconto_percentual: String(imovel.desconto_percentual ?? 0),
      })
    } else {
      reset({
        apelido: '', endereco: '', tipo: 'apartamento',
        valor_aluguel: '', dia_vencimento: '10',
        data_inicio_contrato: '', data_proximo_reajuste: '',
        indice_reajuste: 'fixo', percentual_fixo: '', observacoes: '',
        billing_mode: 'MANUAL',
        multa_percentual: '2',
        juros_percentual: '1',
        desconto_percentual: '0',
      })
    }
  }, [open, imovel, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
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
        billing_mode: data.billing_mode,
        multa_percentual: Number(data.multa_percentual),
        juros_percentual: Number(data.juros_percentual),
        desconto_percentual: Number(data.desconto_percentual),
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
              <Input id="data_inicio_contrato" type="date" {...register('data_inicio_contrato')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="data_proximo_reajuste">Próximo reajuste</Label>
              <Input id="data_proximo_reajuste" type="date" {...register('data_proximo_reajuste')} />
            </div>
          </div>

          {/* ── Cobrança automática ────────────────────────────────────────── */}
          <div className="space-y-3 rounded-lg border border-dashed border-emerald-200 bg-emerald-50/40 p-3.5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-emerald-600" />
              <span className="text-sm font-medium text-emerald-800">Cobrança automática (Asaas)</span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="billing_mode">Modo de cobrança</Label>
              <select id="billing_mode" className={sel} {...register('billing_mode')}>
                <option value="MANUAL">Manual — registrar pagamentos manualmente</option>
                <option value="AUTOMATIC">Automático — gerar PIX/boleto via Asaas</option>
              </select>
            </div>

            {billingMode === 'AUTOMATIC' && (
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="multa_percentual">Multa (%)</Label>
                  <Input id="multa_percentual" type="number" step="0.01" min="0" placeholder="2.00" {...register('multa_percentual')} />
                  {errors.multa_percentual && <p className="text-destructive text-xs">{errors.multa_percentual.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="juros_percentual">Juros a.m. (%)</Label>
                  <Input id="juros_percentual" type="number" step="0.01" min="0" placeholder="1.00" {...register('juros_percentual')} />
                  {errors.juros_percentual && <p className="text-destructive text-xs">{errors.juros_percentual.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="desconto_percentual">Desconto (%)</Label>
                  <Input id="desconto_percentual" type="number" step="0.01" min="0" placeholder="0.00" {...register('desconto_percentual')} />
                  {errors.desconto_percentual && <p className="text-destructive text-xs">{errors.desconto_percentual.message}</p>}
                </div>
              </div>
            )}

            {billingMode === 'MANUAL' && (
              <p className="text-xs text-slate-500">
                No modo manual, os pagamentos devem ser registrados manualmente no sistema.
                Ative o modo automático para gerar cobranças via PIX e boleto com o Asaas.
              </p>
            )}
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
