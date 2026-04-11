export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          nome: string
          email: string
          telefone: string | null
          plano: 'gratis' | 'pago'
          stripe_customer_id: string | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id: string
          nome: string
          email: string
          telefone?: string | null
          plano?: 'gratis' | 'pago'
          stripe_customer_id?: string | null
        }
        Update: {
          nome?: string
          email?: string
          telefone?: string | null
          plano?: 'gratis' | 'pago'
          stripe_customer_id?: string | null
        }
        Relationships: []
      }
      imoveis: {
        Row: {
          id: string
          user_id: string
          apelido: string
          endereco: string
          tipo: 'apartamento' | 'casa' | 'kitnet' | 'comercial' | 'terreno' | 'outro'
          valor_aluguel: number
          dia_vencimento: number
          data_inicio_contrato: string | null
          data_proximo_reajuste: string | null
          indice_reajuste: 'igpm' | 'ipca' | 'fixo'
          percentual_fixo: number | null
          ativo: boolean
          observacoes: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          apelido: string
          endereco: string
          tipo: 'apartamento' | 'casa' | 'kitnet' | 'comercial' | 'terreno' | 'outro'
          valor_aluguel: number
          dia_vencimento: number
          data_inicio_contrato?: string | null
          data_proximo_reajuste?: string | null
          indice_reajuste?: 'igpm' | 'ipca' | 'fixo'
          percentual_fixo?: number | null
          ativo?: boolean
          observacoes?: string | null
        }
        Update: {
          apelido?: string
          endereco?: string
          tipo?: 'apartamento' | 'casa' | 'kitnet' | 'comercial' | 'terreno' | 'outro'
          valor_aluguel?: number
          dia_vencimento?: number
          data_inicio_contrato?: string | null
          data_proximo_reajuste?: string | null
          indice_reajuste?: 'igpm' | 'ipca' | 'fixo'
          percentual_fixo?: number | null
          ativo?: boolean
          observacoes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "imoveis_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      inquilinos: {
        Row: {
          id: string
          user_id: string
          imovel_id: string
          nome: string
          telefone: string | null
          email: string | null
          cpf: string | null
          ativo: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          imovel_id: string
          nome: string
          telefone?: string | null
          email?: string | null
          cpf?: string | null
          ativo?: boolean
        }
        Update: {
          imovel_id?: string
          nome?: string
          telefone?: string | null
          email?: string | null
          cpf?: string | null
          ativo?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "inquilinos_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquilinos_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          }
        ]
      }
      alugueis: {
        Row: {
          id: string
          imovel_id: string
          inquilino_id: string | null
          mes_referencia: string
          valor: number
          data_vencimento: string
          status: 'pendente' | 'pago' | 'atrasado'
          data_pagamento: string | null
          observacao: string | null
          recibo_gerado: boolean
          criado_em: string
        }
        Insert: {
          id?: string
          imovel_id: string
          inquilino_id?: string | null
          mes_referencia: string
          valor: number
          data_vencimento: string
          status?: 'pendente' | 'pago' | 'atrasado'
          data_pagamento?: string | null
          observacao?: string | null
          recibo_gerado?: boolean
        }
        Update: {
          inquilino_id?: string | null
          valor?: number
          data_vencimento?: string
          status?: 'pendente' | 'pago' | 'atrasado'
          data_pagamento?: string | null
          observacao?: string | null
          recibo_gerado?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "alugueis_imovel_id_fkey"
            columns: ["imovel_id"]
            isOneToOne: false
            referencedRelation: "imoveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alugueis_inquilino_id_fkey"
            columns: ["inquilino_id"]
            isOneToOne: false
            referencedRelation: "inquilinos"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
