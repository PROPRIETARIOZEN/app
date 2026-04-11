import { Resend } from 'resend'
import { formatarMoeda, formatarMesReferencia, formatarData } from './helpers'

const resend = new Resend(process.env.RESEND_API_KEY)

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
    from: `ProprietárioZen <noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace('http://', '').replace('https://', '') || 'proprietariozen.com.br'}>`,
    to: [para],
    subject: `Cobrança de Aluguel — ${formatarMesReferencia(mesReferencia)}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">ProprietárioZen</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Aviso de Cobrança</p>
        </div>

        <div style="background-color: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Olá, <strong>${nomeInquilino}</strong>!</p>

          <p>Este é um lembrete de cobrança do seu aluguel referente ao mês de
          <strong>${formatarMesReferencia(mesReferencia)}</strong>.</p>

          <div style="background-color: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Imóvel:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">${enderecoImovel}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Mês de referência:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">${formatarMesReferencia(mesReferencia)}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6;">
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vencimento:</td>
                <td style="padding: 8px 0; font-weight: 600; text-align: right;">${formatarData(dataVencimento)}</td>
              </tr>
              <tr style="border-top: 1px solid #f3f4f6; background-color: #eff6ff;">
                <td style="padding: 12px 8px; color: #1e40af; font-weight: 700; font-size: 16px;">Valor:</td>
                <td style="padding: 12px 8px; color: #1e40af; font-weight: 700; font-size: 18px; text-align: right;">${formatarMoeda(valorAluguel)}</td>
              </tr>
            </table>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Em caso de dúvidas, entre em contato com o seu proprietário, <strong>${nomeProprietario}</strong>.
          </p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            Este e-mail foi enviado automaticamente pelo ProprietárioZen.<br />
            Por favor, não responda a este e-mail.
          </p>
        </div>
      </div>
    `,
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
    from: `ProprietárioZen <noreply@${process.env.NEXT_PUBLIC_APP_URL?.replace('http://', '').replace('https://', '') || 'proprietariozen.com.br'}>`,
    to: [para],
    subject: 'Bem-vindo ao ProprietárioZen!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1e40af; color: white; padding: 24px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="margin: 0; font-size: 28px;">ProprietárioZen</h1>
          <p style="margin: 8px 0 0; opacity: 0.9;">Gestão de imóveis simplificada</p>
        </div>

        <div style="background-color: #f9fafb; padding: 32px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #111827;">Olá, ${nome}! Seja bem-vindo(a)!</h2>

          <p>Estamos muito felizes em ter você no ProprietárioZen. A partir de agora você pode:</p>

          <ul style="color: #374151; line-height: 1.8;">
            <li>Cadastrar e gerenciar seus imóveis</li>
            <li>Controlar seus inquilinos e contratos</li>
            <li>Acompanhar pagamentos e cobranças</li>
            <li>Gerar recibos em PDF automaticamente</li>
            <li>Enviar cobranças por e-mail</li>
          </ul>

          <div style="text-align: center; margin: 32px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard"
               style="background-color: #1e40af; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
              Acessar minha conta
            </a>
          </div>

          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
            ProprietárioZen — Gestão de imóveis simplificada
          </p>
        </div>
      </div>
    `,
  })

  if (error) throw error
  return data
}
