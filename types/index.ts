export type { Database } from './database'

export type TipoImovel = 'apartamento' | 'casa' | 'kitnet' | 'comercial' | 'terreno' | 'outro'
export type IndiceReajuste = 'igpm' | 'ipca' | 'fixo'
export type StatusPagamento = 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'estornado'
export type BillingMode = 'MANUAL' | 'AUTOMATIC'
export type StatusImovel = 'disponivel' | 'alugado' | 'manutencao'

export type Imovel = {
  id: string
  user_id: string
  apelido: string
  endereco: string
  tipo: TipoImovel
  valor_aluguel: number
  dia_vencimento: number
  data_inicio_contrato: string | null
  data_proximo_reajuste: string | null
  indice_reajuste: IndiceReajuste
  percentual_fixo: number | null
  ativo: boolean
  observacoes: string | null
  criado_em: string
  billing_mode: BillingMode
  multa_percentual: number
  juros_percentual: number
  desconto_percentual: number
  asaas_subscription_id: string | null
  inquilinos?: { id: string; nome: string; ativo: boolean }[]
}

export type Inquilino = {
  id: string
  user_id: string
  imovel_id: string
  nome: string
  telefone: string | null
  email: string | null
  cpf: string | null
  ativo: boolean
  criado_em: string
  imovel?: { id: string; apelido: string } | null
}

export type Aluguel = {
  id: string
  imovel_id: string
  inquilino_id: string | null
  mes_referencia: string
  valor: number
  data_vencimento: string
  status: StatusPagamento
  data_pagamento: string | null
  observacao: string | null
  recibo_gerado: boolean
  criado_em: string
}

export type Profile = {
  id: string
  nome: string
  email: string
  telefone: string | null
  plano: 'gratis' | 'pago'
  stripe_customer_id: string | null
  criado_em: string
  atualizado_em: string
}
