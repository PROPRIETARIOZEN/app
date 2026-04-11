export type { Database } from './database'

export type Imovel = {
  id: string
  proprietario_id: string
  titulo: string
  endereco: string
  cidade: string
  estado: string
  cep: string
  tipo: 'apartamento' | 'casa' | 'comercial' | 'terreno' | 'outro'
  status: 'disponivel' | 'alugado' | 'manutencao'
  valor_aluguel: number
  descricao: string | null
  created_at: string
  updated_at: string
}

export type Inquilino = {
  id: string
  proprietario_id: string
  nome: string
  email: string
  cpf: string
  telefone: string
  created_at: string
  updated_at: string
}

export type Contrato = {
  id: string
  imovel_id: string
  inquilino_id: string
  proprietario_id: string
  data_inicio: string
  data_fim: string | null
  valor_aluguel: number
  dia_vencimento: number
  status: 'ativo' | 'encerrado' | 'cancelado'
  created_at: string
  updated_at: string
  imovel?: Imovel
  inquilino?: Inquilino
}

export type Pagamento = {
  id: string
  contrato_id: string
  proprietario_id: string
  valor: number
  mes_referencia: string
  data_vencimento: string
  data_pagamento: string | null
  status: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
  observacao: string | null
  created_at: string
  updated_at: string
  contrato?: Contrato
}

export type Profile = {
  id: string
  nome: string
  email: string
  telefone: string | null
  created_at: string
  updated_at: string
}

export type TipoImovel = 'apartamento' | 'casa' | 'comercial' | 'terreno' | 'outro'
export type StatusImovel = 'disponivel' | 'alugado' | 'manutencao'
export type StatusContrato = 'ativo' | 'encerrado' | 'cancelado'
export type StatusPagamento = 'pendente' | 'pago' | 'atrasado' | 'cancelado'
