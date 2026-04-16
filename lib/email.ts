import { Resend } from 'resend'
import { formatarMoeda, formatarMesReferencia, formatarData } from './helpers'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM =
  process.env.RESEND_FROM_EMAIL ??
  `ProprietárioZen <noreply@proprietariozen.com.br>`

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proprietariozen.com.br'

// ─── Base layout ─────────────────────────────────────────────────────────────

function wrapEmail(headerBg: string, headerLabel: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ProprietárioZen</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" role="presentation"
             style="max-width:600px;width:100%;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">
        <tr>
          <td style="background:${headerBg};padding:28px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:2px;color:rgba(255,255,255,.7);text-transform:uppercase;">ProprietárioZen</p>
            <h1 style="margin:0;font-size:22px;font-weight:800;color:#fff;">${headerLabel}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 32px 24px;">
            ${body}
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
              Este e-mail foi gerado automaticamente pelo <strong>ProprietárioZen</strong>.<br />
              Por favor, não responda a esta mensagem.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function infoTable(rows: [string, string][]): string {
  const trs = rows
    .map(
      ([label, value]) => `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:10px 16px;font-size:13px;color:#6b7280;white-space:nowrap;">${label}</td>
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#111827;text-align:right;">${value}</td>
    </tr>`,
    )
    .join('')
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation"
    style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin:20px 0;">${trs}</table>`
}

function ctaButton(text: string, href: string, color = '#1e40af'): string {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${href}" style="display:inline-block;background:${color};color:#fff;padding:13px 32px;
       border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.3px;">${text}</a>
  </div>`
}

// ─── Template 1: Lembrete de vencimento ──────────────────────────────────────

interface VencimentoParams {
  para: string
  nomeProprietario: string
  nomeImovel: string
  nomeInquilino: string | null
  valor: number
  dataVencimento: string
  mesReferencia: string
}

export async function enviarLembreteVencimento(p: VencimentoParams) {
  const body = `
    <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>${p.nomeProprietario}</strong>!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      O aluguel do imóvel <strong>${p.nomeImovel}</strong> vence em <strong>3 dias</strong>.
      Fique atento caso ainda não tenha recebido o pagamento.
    </p>
    ${infoTable([
      ['Imóvel', p.nomeImovel],
      ['Inquilino', p.nomeInquilino ?? 'Sem inquilino'],
      ['Referência', formatarMesReferencia(p.mesReferencia)],
      ['Vencimento', formatarData(p.dataVencimento)],
      ['Valor', formatarMoeda(p.valor)],
    ])}
    ${ctaButton('Ver detalhes no ProprietárioZen', `${APP_URL}/alugueis`, '#d97706')}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      Após receber, registre o pagamento no sistema para manter seu controle atualizado.
    </p>`

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [p.para],
    subject: `Aluguel vence em 3 dias — ${p.nomeImovel}`,
    html: wrapEmail('#d97706', 'Vencimento em 3 dias', body),
  })
  if (error) throw error
  return data
}

// ─── Template 2: Alerta de atraso ────────────────────────────────────────────

interface AtrasoParams {
  para: string
  nomeProprietario: string
  nomeImovel: string
  nomeInquilino: string | null
  valor: number
  dataVencimento: string
  diasAtraso: number
  mesReferencia: string
}

export async function enviarAlertaAtraso(p: AtrasoParams) {
  const diasLabel = `${p.diasAtraso} dia${p.diasAtraso !== 1 ? 's' : ''}`

  const body = `
    <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>${p.nomeProprietario}</strong>!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      O aluguel do imóvel <strong>${p.nomeImovel}</strong> está em atraso há
      <strong style="color:#dc2626;">${diasLabel}</strong>.
      Considere entrar em contato com o inquilino.
    </p>
    <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#991b1b;font-weight:600;">
        ⚠️ Pagamento em atraso — ${diasLabel} após o vencimento
      </p>
    </div>
    ${infoTable([
      ['Imóvel', p.nomeImovel],
      ['Inquilino', p.nomeInquilino ?? 'Sem inquilino'],
      ['Referência', formatarMesReferencia(p.mesReferencia)],
      ['Vencimento', formatarData(p.dataVencimento)],
      ['Valor em aberto', formatarMoeda(p.valor)],
      ['Dias em atraso', diasLabel],
    ])}
    ${ctaButton('Registrar pagamento', `${APP_URL}/alugueis`, '#dc2626')}
    <p style="margin:16px 0 0;font-size:12px;color:#9ca3af;text-align:center;">
      Após receber, registre o pagamento no sistema para baixar o alerta.
    </p>`

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [p.para],
    subject: `Aluguel em atraso — ${p.nomeImovel}`,
    html: wrapEmail('#dc2626', 'Aluguel em Atraso', body),
  })
  if (error) throw error
  return data
}

// ─── Template 3: Alerta de reajuste ──────────────────────────────────────────

interface ReajusteParams {
  para: string
  nomeProprietario: string
  nomeImovel: string
  valorAtual: number
  indiceReajuste: string
  percentualFixo: number | null
  dataReajuste: string
}

const labelsIndice: Record<string, string> = {
  igpm: 'IGPM',
  ipca: 'IPCA',
  fixo: 'Percentual fixo',
}

export async function enviarAlertaReajuste(p: ReajusteParams) {
  const indiceLabel = labelsIndice[p.indiceReajuste] ?? p.indiceReajuste
  const percentualInfo =
    p.indiceReajuste === 'fixo' && p.percentualFixo != null
      ? ` (${p.percentualFixo}%)`
      : ''

  const body = `
    <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>${p.nomeProprietario}</strong>!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      O reajuste do aluguel do imóvel <strong>${p.nomeImovel}</strong> está programado para
      <strong>${formatarData(p.dataReajuste)}</strong> — faltam 30 dias.
      Prepare-se para calcular e aplicar o novo valor.
    </p>
    ${infoTable([
      ['Imóvel', p.nomeImovel],
      ['Valor atual', formatarMoeda(p.valorAtual)],
      ['Índice de reajuste', `${indiceLabel}${percentualInfo}`],
      ['Data do reajuste', formatarData(p.dataReajuste)],
    ])}
    <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px 16px;margin-bottom:20px;">
      <p style="margin:0;font-size:13px;color:#1e40af;font-weight:600;">
        💡 Acesse o ProprietárioZen para calcular e aplicar o reajuste quando chegar a data.
      </p>
    </div>
    ${ctaButton('Aplicar reajuste no painel', `${APP_URL}/dashboard`, '#1e40af')}`

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [p.para],
    subject: `Reajuste de aluguel em 30 dias — ${p.nomeImovel}`,
    html: wrapEmail('#1e40af', 'Reajuste em 30 dias', body),
  })
  if (error) throw error
  return data
}

// ─── Template 4: Convite ao inquilino ────────────────────────────────────────

interface ConviteInquilinoParams {
  para: string
  nomeInquilino: string
  nomeProprietario: string
  nomeImovel: string
  enderecoImovel: string
  token: string
}

export async function enviarConviteInquilino(p: ConviteInquilinoParams) {
  const link = `${APP_URL}/inquilino/${p.token}`

  const body = `
    <p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>${p.nomeInquilino}</strong>!</p>
    <p style="margin:0 0 20px;font-size:15px;color:#374151;">
      <strong>${p.nomeProprietario}</strong> te convidou para acessar sua área exclusiva de inquilino
      no <strong>ProprietárioZen</strong>. Por lá você pode acompanhar tudo sobre o seu aluguel
      sem precisar criar uma conta.
    </p>
    ${infoTable([
      ['Imóvel', p.nomeImovel],
      ['Endereço', p.enderecoImovel],
    ])}
    <p style="margin:0 0 4px;font-size:14px;color:#374151;font-weight:600;">O que você encontra na sua área:</p>
    <ul style="color:#374151;font-size:14px;line-height:2;margin:8px 0 20px;padding-left:20px;">
      <li>Próximo vencimento e valor do aluguel</li>
      <li>Histórico completo de pagamentos</li>
      <li>Documentos do seu contrato</li>
      <li>Dados do imóvel e contato do proprietário</li>
    </ul>
    ${ctaButton('Acessar minha área', link, '#059669')}
    <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;text-align:center;line-height:1.6;">
      Este link é pessoal e permanente. Não compartilhe com outras pessoas.<br />
      Caso precise de ajuda, entre em contato com ${p.nomeProprietario}.
    </p>`

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [p.para],
    subject: `Seu acesso ao ProprietárioZen — ${p.nomeImovel}`,
    html: wrapEmail('#059669', 'Área do Inquilino', body),
  })
  if (error) throw error
  return data
}

// ─── Funções legadas (mantidas para compatibilidade) ─────────────────────────

interface EmailCobrancaParams {
  para: string
  nomeInquilino: string
  nomeProprietario: string
  valorAluguel: number
  mesReferencia: string
  dataVencimento: string
  enderecoImovel: string
}

export async function enviarEmailCobranca({
  para,
  nomeInquilino,
  nomeProprietario,
  valorAluguel,
  mesReferencia,
  dataVencimento,
  enderecoImovel,
}: EmailCobrancaParams) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [para],
    subject: `Cobrança de Aluguel — ${formatarMesReferencia(mesReferencia)}`,
    html: wrapEmail(
      '#1e40af',
      'Cobrança de Aluguel',
      `<p style="margin:0 0 8px;font-size:15px;color:#374151;">Olá, <strong>${nomeInquilino}</strong>!</p>
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">
        Este é um lembrete do seu aluguel referente a <strong>${formatarMesReferencia(mesReferencia)}</strong>.
      </p>
      ${infoTable([
        ['Imóvel', enderecoImovel],
        ['Referência', formatarMesReferencia(mesReferencia)],
        ['Vencimento', formatarData(dataVencimento)],
        ['Valor', formatarMoeda(valorAluguel)],
      ])}
      <p style="font-size:13px;color:#6b7280;">
        Em caso de dúvidas, entre em contato com o seu proprietário, <strong>${nomeProprietario}</strong>.
      </p>`,
    ),
  })
  if (error) throw error
  return data
}

interface EmailBemVindoParams {
  para: string
  nome: string
}

export async function enviarEmailBemVindo({ para, nome }: EmailBemVindoParams) {
  const { data, error } = await resend.emails.send({
    from: FROM,
    to: [para],
    subject: 'Bem-vindo ao ProprietárioZen!',
    html: wrapEmail(
      '#1e40af',
      `Bem-vindo, ${nome}!`,
      `<p style="font-size:15px;color:#374151;">
        Estamos muito felizes em ter você no ProprietárioZen. A partir de agora você pode:
      </p>
      <ul style="color:#374151;font-size:14px;line-height:2;">
        <li>Cadastrar e gerenciar seus imóveis</li>
        <li>Controlar inquilinos e contratos</li>
        <li>Acompanhar pagamentos e aluguéis</li>
        <li>Gerar recibos em PDF automaticamente</li>
        <li>Receber alertas de vencimento e atraso por e-mail</li>
      </ul>
      ${ctaButton('Acessar minha conta', `${APP_URL}/dashboard`)}`,
    ),
  })
  if (error) throw error
  return data
}
