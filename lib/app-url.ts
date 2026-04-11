/**
 * Retorna a URL base do app sem barra no final.
 *
 * Ordem de precedência:
 *  1. NEXT_PUBLIC_APP_URL — se definida e não apontar para localhost
 *  2. VERCEL_PROJECT_PRODUCTION_URL — URL estável do projeto no Vercel
 *  3. VERCEL_URL — URL da deployment atual (muda a cada deploy)
 *  4. Fallback hardcoded
 */
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit && !explicit.includes('localhost')) {
    return explicit.replace(/\/$/, '')
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  return 'https://proprietariozen.com.br'
}
