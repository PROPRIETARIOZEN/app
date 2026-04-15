import { config } from 'dotenv'
import path from 'path'

// Carrega .env.local (tem prioridade sobre .env)
config({ path: path.resolve(process.cwd(), '.env.local'), override: true })

const apiKey =
  process.env.ASAAS_API_KEY_ROOT ??
  process.env.ASAAS_API_KEY

const baseUrl =
  (process.env.ASAAS_BASE_URL ?? 'https://sandbox.asaas.com/api/v3')
    .replace(/\/$/, '')

type MyAccount = {
  name?: string
  email?: string
  commercialInfoStatus?: string
  accountStatus?: { general?: string; [key: string]: string | undefined }
  errors?: { description: string }[]
  [key: string]: unknown
}

async function main() {
  if (!apiKey) {
    console.error('❌  Variável ASAAS_API_KEY_ROOT (ou ASAAS_API_KEY) não encontrada no .env.local')
    process.exit(1)
  }

  console.log(`\n🔌  Testando conexão Asaas`)
  console.log(`    URL  : ${baseUrl}/myAccount`)
  console.log(`    Chave: ${apiKey.slice(0, 12)}${'*'.repeat(8)}\n`)

  let res: Response
  try {
    res = await fetch(`${baseUrl}/myAccount`, {
      headers: {
        'access_token': apiKey,
        'User-Agent': 'ProprietarioZen/script',
      },
    })
  } catch (err) {
    console.error('❌  Falha de rede ao conectar ao Asaas:')
    console.error(`    ${err instanceof Error ? err.message : String(err)}`)
    console.error('\n    Verifique a variável ASAAS_BASE_URL no .env.local')
    process.exit(1)
  }

  const body = await res.json() as MyAccount

  if (!res.ok) {
    console.error(`❌  HTTP ${res.status}`)
    if (body.errors?.length) {
      body.errors.forEach(e => console.error(`    → ${e.description}`))
    } else {
      console.error('   ', JSON.stringify(body, null, 2))
    }
    process.exit(1)
  }

  console.log('✅  Conexão bem-sucedida!\n')
  console.log(`    Nome da conta :  ${body.name ?? '—'}`)
  console.log(`    E-mail        :  ${body.email ?? '—'}`)
  console.log(`    Status geral  :  ${body.commercialInfoStatus ?? body.accountStatus?.general ?? '—'}`)
  console.log()
}

main()
