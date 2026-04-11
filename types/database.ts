export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome: string
          email: string
          telefone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          telefone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          telefone?: string | null
          updated_at?: string
        }
      }
      imoveis: {
        Row: {
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
        Insert: {
          id?: string
          proprietario_id: string
          titulo: string
          endereco: string
          cidade: string
          estado: string
          cep: string
          tipo: 'apartamento' | 'casa' | 'comercial' | 'terreno' | 'outro'
          status?: 'disponivel' | 'alugado' | 'manutencao'
          valor_aluguel: number
          descricao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          titulo?: string
          endereco?: string
          cidade?: string
          estado?: string
          cep?: string
          tipo?: 'apartamento' | 'casa' | 'comercial' | 'terreno' | 'outro'
          status?: 'disponivel' | 'alugado' | 'manutencao'
          valor_aluguel?: number
          descricao?: string | null
          updated_at?: string
        }
      }
      inquilinos: {
        Row: {
          id: string
          proprietario_id: string
          nome: string
          email: string
          cpf: string
          telefone: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          proprietario_id: string
          nome: string
          email: string
          cpf: string
          telefone: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          nome?: string
          email?: string
          cpf?: string
          telefone?: string
          updated_at?: string
        }
      }
      contratos: {
        Row: {
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
        }
        Insert: {
          id?: string
          imovel_id: string
          inquilino_id: string
          proprietario_id: string
          data_inicio: string
          data_fim?: string | null
          valor_aluguel: number
          dia_vencimento: number
          status?: 'ativo' | 'encerrado' | 'cancelado'
          created_at?: string
          updated_at?: string
        }
        Update: {
          data_fim?: string | null
          valor_aluguel?: number
          dia_vencimento?: number
          status?: 'ativo' | 'encerrado' | 'cancelado'
          updated_at?: string
        }
      }
      pagamentos: {
        Row: {
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
        }
        Insert: {
          id?: string
          contrato_id: string
          proprietario_id: string
          valor: number
          mes_referencia: string
          data_vencimento: string
          data_pagamento?: string | null
          status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
          observacao?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          valor?: number
          data_pagamento?: string | null
          status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado'
          observacao?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
