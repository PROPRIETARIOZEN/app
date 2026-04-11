import Stripe from 'stripe'

let _stripe: Stripe | undefined

// Lazy singleton — evita inicialização no momento do build (env vars ausentes)
export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { typescript: true })
  }
  return _stripe
}

// Limites e recursos por plano
export const LIMITES_PLANO = {
  gratis: {
    nome: 'Grátis',
    maxImoveis: 1,
    recibos: false,
    reajuste: false,
    relatorios: false,
  },
  pago: {
    nome: 'Pro',
    maxImoveis: 5,
    recibos: true,
    reajuste: true,
    relatorios: true,
  },
} as const

export type PlanoKey = keyof typeof LIMITES_PLANO

// Verifica se o usuário pode adicionar mais imóveis
export function podeAdicionarImovel(plano: PlanoKey, qtdAtual: number): boolean {
  return qtdAtual < LIMITES_PLANO[plano].maxImoveis
}
