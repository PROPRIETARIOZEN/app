'use client'

import { useState } from 'react'
import { Plus, Building2, Pencil, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { EmptyState } from '@/components/dashboard/empty-state'
import { ImovelModal } from '@/components/imoveis/imovel-modal'
import { arquivarImovel } from '@/app/(dashboard)/imoveis/actions'
import { formatarMoeda } from '@/lib/helpers'
import type { Imovel } from '@/types'

const labelsTipo: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  kitnet: 'Kitnet',
  comercial: 'Comercial',
  terreno: 'Terreno',
  outro: 'Outro',
}

export function ImoveisClient({ imoveis }: { imoveis: Imovel[] }) {
  const [open, setOpen] = useState(false)
  const [editando, setEditando] = useState<Imovel | null>(null)

  function handleNovo() {
    setEditando(null)
    setOpen(true)
  }

  function handleEditar(imovel: Imovel) {
    setEditando(imovel)
    setOpen(true)
  }

  async function handleArquivar(imovel: Imovel) {
    if (!confirm(`Arquivar "${imovel.apelido}"? O imóvel não aparecerá mais na listagem.`)) return
    const result = await arquivarImovel(imovel.id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Imóvel arquivado')
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Imóveis</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {imoveis.length} imóvel{imoveis.length !== 1 ? 's' : ''} ativo{imoveis.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button onClick={handleNovo} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo imóvel
        </Button>
      </div>

      {imoveis.length === 0 ? (
        <EmptyState
          icon={Building2}
          titulo="Nenhum imóvel cadastrado"
          descricao="Cadastre seu primeiro imóvel para começar a gerenciar seus aluguéis."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {imoveis.map(imovel => {
            const inquilinoAtivo = imovel.inquilinos?.find(i => i.ativo)
            const ocupado = !!inquilinoAtivo
            return (
              <Card key={imovel.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{imovel.apelido}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{imovel.endereco}</p>
                    </div>
                    <Badge variant={ocupado ? 'default' : 'outline'} className="shrink-0 text-xs">
                      {ocupado ? 'Ocupado' : 'Vago'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Aluguel</span>
                    <span className="font-semibold">{formatarMoeda(imovel.valor_aluguel)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vencimento</span>
                    <span>Dia {imovel.dia_vencimento}</span>
                  </div>
                  {inquilinoAtivo && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Inquilino</span>
                      <span className="truncate max-w-[140px] text-right">{inquilinoAtivo.nome}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tipo</span>
                    <Badge variant="outline" className="text-xs">{labelsTipo[imovel.tipo] ?? imovel.tipo}</Badge>
                  </div>
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={() => handleEditar(imovel)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-muted-foreground"
                      onClick={() => handleArquivar(imovel)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Arquivar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <ImovelModal open={open} onOpenChange={setOpen} imovel={editando} />
    </>
  )
}
