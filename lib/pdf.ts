import jsPDF from 'jspdf'
import { formatarData, formatarMoeda, formatarMesReferencia, formatarCPF } from './helpers'

interface DadosRecibo {
  pagamento: {
    id: string
    valor: number
    mes_referencia: string
    data_vencimento: string
    data_pagamento: string | null
    status: string
    observacao: string | null
    imovel: {
      apelido: string
      endereco: string
    }
    inquilino: {
      nome: string
      cpf: string | null
      email: string | null
      telefone: string | null
    }
  }
  proprietario: {
    nome: string
    email: string
    telefone: string | null
  }
}

export function gerarReciboPDF({ pagamento, proprietario }: DadosRecibo): void {
  const doc = new jsPDF()
  const { imovel, inquilino } = pagamento

  const margemEsq = 20
  const larguraUtil = 170
  let y = 20

  // Cabeçalho
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.text('RECIBO DE ALUGUEL', 105, y, { align: 'center' })

  y += 8
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100)
  doc.text(`ProprietárioZen — Gestão de Imóveis`, 105, y, { align: 'center' })

  // Linha divisória
  y += 6
  doc.setDrawColor(200)
  doc.setLineWidth(0.5)
  doc.line(margemEsq, y, margemEsq + larguraUtil, y)

  // Número e data
  y += 10
  doc.setTextColor(0)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text(`Recibo nº: ${pagamento.id.slice(0, 8).toUpperCase()}`, margemEsq, y)
  doc.text(`Data de emissão: ${formatarData(new Date())}`, 190, y, { align: 'right' })

  // Caixa de valor
  y += 12
  doc.setFillColor(245, 247, 250)
  doc.roundedRect(margemEsq, y, larguraUtil, 18, 3, 3, 'F')
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 64, 175)
  doc.text(
    `Valor: ${formatarMoeda(pagamento.valor)}  —  Ref.: ${formatarMesReferencia(pagamento.mes_referencia)}`,
    105,
    y + 11,
    { align: 'center' }
  )

  // Seção: Locatário
  y += 26
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  doc.text('LOCATÁRIO', margemEsq, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Nome: ${inquilino.nome}`, margemEsq, y)
  y += 6
  if (inquilino.cpf) { doc.text(`CPF: ${formatarCPF(inquilino.cpf)}`, margemEsq, y); y += 6 }
  if (inquilino.email) { doc.text(`E-mail: ${inquilino.email}`, margemEsq, y); y += 6 }
  if (inquilino.telefone) { doc.text(`Telefone: ${inquilino.telefone}`, margemEsq, y) }

  // Seção: Imóvel
  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('IMÓVEL', margemEsq, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`${imovel.apelido}`, margemEsq, y)
  y += 6
  doc.text(`Endereço: ${imovel.endereco}`, margemEsq, y)

  // Seção: Pagamento
  y += 12
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('DADOS DO PAGAMENTO', margemEsq, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Mês de referência: ${formatarMesReferencia(pagamento.mes_referencia)}`, margemEsq, y)
  y += 6
  doc.text(`Vencimento: ${formatarData(pagamento.data_vencimento)}`, margemEsq, y)
  y += 6
  if (pagamento.data_pagamento) {
    doc.text(`Data de pagamento: ${formatarData(pagamento.data_pagamento)}`, margemEsq, y)
    y += 6
  }
  doc.text(`Status: ${pagamento.status.toUpperCase()}`, margemEsq, y)

  if (pagamento.observacao) {
    y += 6
    doc.text(`Observação: ${pagamento.observacao}`, margemEsq, y)
  }

  // Seção: Locador
  y += 14
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('LOCADOR', margemEsq, y)

  y += 6
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(`Nome: ${proprietario.nome}`, margemEsq, y)
  y += 6
  doc.text(`E-mail: ${proprietario.email}`, margemEsq, y)
  if (proprietario.telefone) {
    y += 6
    doc.text(`Telefone: ${proprietario.telefone}`, margemEsq, y)
  }

  // Linha divisória e declaração
  y += 12
  doc.setDrawColor(200)
  doc.line(margemEsq, y, margemEsq + larguraUtil, y)

  y += 8
  doc.setFontSize(9)
  doc.setTextColor(80)
  const declaracao = `Declaro que recebi a quantia de ${formatarMoeda(pagamento.valor)} referente ao aluguel do imóvel acima descrito, ` +
    `relativo ao período de ${formatarMesReferencia(pagamento.mes_referencia)}, dando plena quitação.`
  const linhas = doc.splitTextToSize(declaracao, larguraUtil)
  doc.text(linhas, margemEsq, y)

  // Assinatura
  y += linhas.length * 5 + 16
  doc.setDrawColor(0)
  doc.setLineWidth(0.3)
  doc.line(margemEsq, y, margemEsq + 70, y)
  y += 5
  doc.setFontSize(9)
  doc.setTextColor(0)
  doc.text(proprietario.nome, margemEsq, y)
  y += 4
  doc.text('Locador', margemEsq, y)

  // Rodapé
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text(
    `Documento gerado pelo ProprietárioZen em ${formatarData(new Date())}`,
    105,
    285,
    { align: 'center' }
  )

  doc.save(`recibo_${pagamento.mes_referencia}_${inquilino.nome.replace(/\s+/g, '_')}.pdf`)
}
