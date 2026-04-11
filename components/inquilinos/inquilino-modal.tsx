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
import { criarInquilino, editarInquilino } from '@/app/(dashboard)/inquilinos/actions'
import type { Inquilino } from '@/types'

const sel = "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none transition-colors focus:border-ring disabled:cursor-not-allowed disabled:opacity-50"

const schema = z.object({
  nome: z.string().min(1, 'Obrigatório'),
  imovel_id: z.string().min(1, 'Selecione um imóvel'),
  telefone: z.string().optional(),
  email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional(),
  cpf: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface InquilinoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inquilino: Inquilino | null
  imoveis: { id: string; apelido: string }[]
}

export function InquilinoModal({ open, onOpenChange, inquilino, imoveis }: InquilinoModalProps) {
  const [loading, setLoading] = useState(false)
  const editando = !!inquilino

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  useEffect(() => {
    if (!open) return
    if (inquilino) {
      reset({
        nome: inquilino.nome,
        imovel_id: inquilino.imovel_id,
        telefone: inquilino.telefone ?? '',
        email: inquilino.email ?? '',
        cpf: inquilino.cpf ?? '',
      })
    } else {
      reset({ nome: '', imovel_id: '', telefone: '', email: '', cpf: '' })
    }
  }, [open, inquilino, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const input = {
        imovel_id: data.imovel_id,
        nome: data.nome,
        telefone: data.telefone || null,
        email: data.email || null,
        cpf: data.cpf || null,
      }
      const result = editando
        ? await editarInquilino(inquilino!.id, input)
        : await criarInquilino(input)

      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(editando ? 'Inquilino atualizado!' : 'Inquilino cadastrado!')
        onOpenChange(false)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? 'Editar inquilino' : 'Novo inquilino'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="nome">Nome completo</Label>
            <Input id="nome" placeholder="João da Silva" {...register('nome')} />
            {errors.nome && <p className="text-destructive text-xs">{errors.nome.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="imovel_id">Imóvel vinculado</Label>
            <select id="imovel_id" className={sel} {...register('imovel_id')}>
              <option value="">Selecione um imóvel</option>
              {imoveis.map(i => (
                <option key={i.id} value={i.id}>{i.apelido}</option>
              ))}
            </select>
            {errors.imovel_id && <p className="text-destructive text-xs">{errors.imovel_id.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="telefone">Telefone</Label>
              <Input id="telefone" placeholder="(11) 99999-9999" {...register('telefone')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cpf">CPF</Label>
              <Input id="cpf" placeholder="000.000.000-00" {...register('cpf')} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" placeholder="joao@email.com" {...register('email')} />
            {errors.email && <p className="text-destructive text-xs">{errors.email.message}</p>}
          </div>

          <div className="-mx-4 -mb-4 flex gap-2 justify-end border-t bg-muted/50 p-4 rounded-b-xl">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {editando ? 'Salvar alterações' : 'Cadastrar inquilino'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
