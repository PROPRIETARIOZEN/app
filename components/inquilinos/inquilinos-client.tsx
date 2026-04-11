'use client'

import { useState } from 'react'
import { Plus, Users, Pencil, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { InquilinoModal } from '@/components/inquilinos/inquilino-modal'
import { desativarInquilino } from '@/app/(dashboard)/inquilinos/actions'
import { formatarTelefone } from '@/lib/helpers'
import type { Inquilino } from '@/types'

type ImovelOpcao = { id: string; apelido: string }

export function InquilinosClient({
  inquilinos,
  imoveis,
}: {
  inquilinos: Inquilino[]
  imoveis: ImovelOpcao[]
}) {
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Inquilino | null>(null)

  function handleNovo() {
    setEditando(null)
    setOpen(true)
  }

  function handleEditar(inquilino: Inquilino) {
    setEditando(inquilino)
    setOpen(true)
  }

  async function handleDesativar(inquilino: Inquilino) {
    if (!confirm(`Desativar "${inquilino.nome}"?`)) return
    const result = await desativarInquilino(inquilino.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Inquilino desativado')
    }
  }

  const ativos = inquilinos.filter(i => i.ativo)
  const inativos = inquilinos.filter(i => !i.ativo)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {ativos.length} ativo{ativos.length !== 1 ? 's' : ''}
            {inativos.length > 0 && ` · ${inativos.length} inativo${inativos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo inquilino
        </Button>
      </div>

      {inquilinos.length === 0 ? (
        <EmptyState
          icon={Users}
          titulo="Nenhum inquilino cadastrado"
          descricao="Cadastre inquilinos e vincule-os aos seus imóveis."
        />
      ) : (
        <div className="space-y-2">
          {inquilinos.map(inquilino => (
            <Card key={inquilino.id} className={inquilino.ativo ? '' : 'opacity-60'}>
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm shrink-0">
                    {inquilino.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{inquilino.nome}</span>
                      <Badge variant={inquilino.ativo ? 'default' : 'outline'} className="text-xs">
                        {inquilino.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {inquilino.telefone && <span>{formatarTelefone(inquilino.telefone)}</span>}
                      {inquilino.email && <span>{inquilino.email}</span>}
                      {inquilino.imovel && (
                        <span className="text-primary font-medium">{inquilino.imovel.apelido}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleEditar(inquilino)}
                      title="Editar"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {inquilino.ativo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDesativar(inquilino)}
                        title="Desativar"
                      >
                        <UserX className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <InquilinoModal open={open} onOpenChange={setOpen} inquilino={editando} imoveis={imoveis} />
    </>
  )
}
