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
import { configurarCobranca } from '@/app/(dashboard)/imoveis/actions'
import type { Imovel } from '@/types'
import type { PlanoTipo } from '@/lib/stripe'
import { cn } from '@/lib/utils'

const schema = z.object({
  billing_mode: z.enum(['MANUAL', 'AUTOMATIC']),
  multa_percentual: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Inválido'),
  juros_percentual: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Inválido'),
  desconto_percentual: z.string().refine(v => !isNaN(Number(v)) && Number(v) >= 0, 'Inválido'),
})

type FormData = z.infer<typeof schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  imovel: Imovel | null
  plano: PlanoTipo
}

export function CobrancaConfigModal({ open, onOpenChange, imovel, plano }: Props) {
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      billing_mode: 'MANUAL',
      multa_percentual: '2',
      juros_percentual: '1',
      desconto_percentual: '0',
    },
  })

  const billingMode = watch('billing_mode')

  useEffect(() => {
    if (!open || !imovel) return
    reset({
      billing_mode: imovel.billing_mode ?? 'MANUAL',
      multa_percentual: String(imovel.multa_percentual ?? 2),
      juros_percentual: String(imovel.juros_percentual ?? 1),
      desconto_percentual: String(imovel.desconto_percentual ?? 0),
    })
  }, [open, imovel, reset])

  async function onSubmit(data: FormData) {
    if (!imovel) return
    setLoading(true)
    try {
      const result = await configurarCobranca(imovel.id, {
        billing_mode: data.billing_mode,
        multa_percentual: Number(data.multa_percentual),
        juros_percentual: Number(data.juros_percentual),
        desconto_percentual: Number(data.desconto_percentual),
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Configurações de cobrança salvas!')
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  if (!imovel) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar cobrança — {imovel.apelido}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 pt-2">
          {/* Modo de cobrança */}
          <div className="space-y-2">
            <Label>Modo de cobrança</Label>
            <div className="space-y-2">
              <label className={cn(
                'flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer transition-colors',
                billingMode === 'MANUAL'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300',
              )}>
                <input
                  type="radio"
                  value="MANUAL"
                  {...register('billing_mode')}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-900">Manual</p>
                  <p className="text-xs text-slate-500 mt-0.5">Você confirma cada pagamento no app</p>
                </div>
              </label>

              <label className={cn(
                'flex items-start gap-3 rounded-lg border p-3.5 transition-colors',
                plano === 'gratis'
                  ? 'cursor-not-allowed opacity-60 border-slate-200'
                  : 'cursor-pointer',
                billingMode === 'AUTOMATIC' && plano !== 'gratis'
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-slate-200 hover:border-slate-300',
              )}>
                <input
                  type="radio"
                  value="AUTOMATIC"
                  {...register('billing_mode')}
                  disabled={plano === 'gratis'}
                  className="mt-0.5 accent-emerald-600"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">Automático via Asaas</p>
                    {plano === 'gratis' && (
                      <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                        Master / Elite
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {plano === 'gratis' ? (
                      <>
                        Disponível no plano Master.{' '}
                        <a href="/planos" className="underline font-medium text-emerald-600">Fazer upgrade</a>
                      </>
                    ) : (
                      'Pix e boleto gerados automaticamente pelo Asaas'
                    )}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Condições de pagamento */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm">Condições de pagamento</Label>
              <p className="text-xs text-slate-400 mt-0.5">Deixe em branco para usar os padrões</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="multa" className="text-xs">Multa por atraso (%)</Label>
                <Input
                  id="multa"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="2"
                  {...register('multa_percentual')}
                />
                {errors.multa_percentual && (
                  <p className="text-destructive text-xs">{errors.multa_percentual.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="juros" className="text-xs">Juros ao mês (%)</Label>
                <Input
                  id="juros"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="1"
                  {...register('juros_percentual')}
                />
                {errors.juros_percentual && (
                  <p className="text-destructive text-xs">{errors.juros_percentual.message}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="desconto" className="text-xs">Desconto (%)</Label>
                <Input
                  id="desconto"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  {...register('desconto_percentual')}
                />
                {errors.desconto_percentual && (
                  <p className="text-destructive text-xs">{errors.desconto_percentual.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar configurações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
