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
          role: 'user' | 'admin'
          stripe_customer_id: string | null
          criado_em: string
          atualizado_em: string
          asaas_account_id: string | null
          asaas_account_status: string | null
          asaas_api_key_enc: string | null
          asaas_wallet_id: string | null
          asaas_customer_id: string | null
          banned: boolean
          banned_at: string | null
          banned_reason: string | null
          banned_by: string | null
        }
        Insert: {
          id: string
          nome: string
          email: string
          telefone?: string | null
          plano?: 'gratis' | 'pago'
          role?: 'user' | 'admin'
          stripe_customer_id?: string | null
          asaas_account_id?: string | null
          asaas_account_status?: string | null
          asaas_api_key_enc?: string | null
          asaas_wallet_id?: string | null
          asaas_customer_id?: string | null
          banned?: boolean
          banned_at?: string | null
          banned_reason?: string | null
          banned_by?: string | null
        }
        Update: {
          nome?: string
          email?: string
          telefone?: string | null
          plano?: 'gratis' | 'pago'
          role?: 'user' | 'admin'
          stripe_customer_id?: string | null
          asaas_account_id?: string | null
          asaas_account_status?: string | null
          asaas_api_key_enc?: string | null
          asaas_wallet_id?: string | null
          asaas_customer_id?: string | null
          banned?: boolean
          banned_at?: string | null
          banned_reason?: string | null
          banned_by?: string | null
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
          billing_mode: 'MANUAL' | 'AUTOMATIC'
          multa_percentual: number
          juros_percentual: number
          desconto_percentual: number
          asaas_subscription_id: string | null
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
          billing_mode?: 'MANUAL' | 'AUTOMATIC'
          multa_percentual?: number
          juros_percentual?: number
          desconto_percentual?: number
          asaas_subscription_id?: string | null
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
          billing_mode?: 'MANUAL' | 'AUTOMATIC'
          multa_percentual?: number
          juros_percentual?: number
          desconto_percentual?: number
          asaas_subscription_id?: string | null
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
          asaas_customer_id: string | null
          convite_enviado_em: string | null
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
          asaas_customer_id?: string | null
          convite_enviado_em?: string | null
        }
        Update: {
          imovel_id?: string
          nome?: string
          telefone?: string | null
          email?: string | null
          cpf?: string | null
          ativo?: boolean
          asaas_customer_id?: string | null
          convite_enviado_em?: string | null
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
          status: 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'estornado'
          data_pagamento: string | null
          observacao: string | null
          recibo_gerado: boolean
          criado_em: string
          asaas_charge_id: string | null
          asaas_pix_qrcode: string | null
          asaas_pix_copiaecola: string | null
          asaas_boleto_url: string | null
          asaas_customer_id: string | null
          valor_pago: number | null
          metodo_pagamento: string | null
        }
        Insert: {
          id?: string
          imovel_id: string
          inquilino_id?: string | null
          mes_referencia: string
          valor: number
          data_vencimento: string
          status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'estornado'
          data_pagamento?: string | null
          observacao?: string | null
          recibo_gerado?: boolean
          asaas_charge_id?: string | null
          asaas_pix_qrcode?: string | null
          asaas_pix_copiaecola?: string | null
          asaas_boleto_url?: string | null
          asaas_customer_id?: string | null
          valor_pago?: number | null
          metodo_pagamento?: string | null
        }
        Update: {
          inquilino_id?: string | null
          valor?: number
          data_vencimento?: string
          status?: 'pendente' | 'pago' | 'atrasado' | 'cancelado' | 'estornado'
          data_pagamento?: string | null
          observacao?: string | null
          recibo_gerado?: boolean
          asaas_charge_id?: string | null
          asaas_pix_qrcode?: string | null
          asaas_pix_copiaecola?: string | null
          asaas_boleto_url?: string | null
          asaas_customer_id?: string | null
          valor_pago?: number | null
          metodo_pagamento?: string | null
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
      documentos_aluguel: {
        Row: {
          id: string
          user_id: string
          aluguel_id: string
          tipo: 'contrato' | 'laudo_entrada' | 'laudo_saida' | 'comprovante' | 'foto' | 'outro'
          nome_arquivo: string
          tamanho_bytes: number
          mime_type: string
          storage_path: string
          descricao: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          aluguel_id: string
          tipo: 'contrato' | 'laudo_entrada' | 'laudo_saida' | 'comprovante' | 'foto' | 'outro'
          nome_arquivo: string
          tamanho_bytes: number
          mime_type: string
          storage_path: string
          descricao?: string | null
        }
        Update: {
          tipo?: 'contrato' | 'laudo_entrada' | 'laudo_saida' | 'comprovante' | 'foto' | 'outro'
          nome_arquivo?: string
          tamanho_bytes?: number
          mime_type?: string
          storage_path?: string
          descricao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_aluguel_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_aluguel_aluguel_id_fkey"
            columns: ["aluguel_id"]
            isOneToOne: false
            referencedRelation: "alugueis"
            referencedColumns: ["id"]
          }
        ]
      }
      documentos_inquilino: {
        Row: {
          id: string
          user_id: string
          inquilino_id: string
          tipo: 'rg' | 'cpf' | 'cnh' | 'comprovante_renda' | 'comprovante_residencia' | 'outro'
          nome_arquivo: string
          tamanho_bytes: number
          mime_type: string
          storage_path: string
          descricao: string | null
          criado_em: string
        }
        Insert: {
          id?: string
          user_id: string
          inquilino_id: string
          tipo: 'rg' | 'cpf' | 'cnh' | 'comprovante_renda' | 'comprovante_residencia' | 'outro'
          nome_arquivo: string
          tamanho_bytes: number
          mime_type: string
          storage_path: string
          descricao?: string | null
        }
        Update: {
          tipo?: 'rg' | 'cpf' | 'cnh' | 'comprovante_renda' | 'comprovante_residencia' | 'outro'
          nome_arquivo?: string
          tamanho_bytes?: number
          mime_type?: string
          storage_path?: string
          descricao?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_inquilino_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documentos_inquilino_inquilino_id_fkey"
            columns: ["inquilino_id"]
            isOneToOne: false
            referencedRelation: "inquilinos"
            referencedColumns: ["id"]
          }
        ]
      }
      inquilino_tokens: {
        Row: {
          id: string
          inquilino_id: string
          user_id: string
          token: string
          ativo: boolean
          criado_em: string
          ultimo_acesso: string | null
        }
        Insert: {
          id?: string
          inquilino_id: string
          user_id: string
          token: string
          ativo?: boolean
          ultimo_acesso?: string | null
        }
        Update: {
          ativo?: boolean
          ultimo_acesso?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquilino_tokens_inquilino_id_fkey"
            columns: ["inquilino_id"]
            isOneToOne: false
            referencedRelation: "inquilinos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquilino_tokens_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
