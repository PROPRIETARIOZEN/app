import { NextResponse, type NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { calcularResumoAnual, formatBRL, formatPct, LIMITE_CARNE_LEAO_2025 } from '@/lib/ir'
import type { PlanoTipo } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plano, role, nome, email')
    .eq('id', user.id)
    .single()

  const plano = (profile?.role === 'admin' ? 'elite' : profile?.plano ?? 'gratis') as PlanoTipo
  if (plano !== 'elite') {
    return NextResponse.json({ error: 'Disponível apenas no plano Elite' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({})) as { ano?: number }
  const anoAtual = new Date().getFullYear()
  const ano = body.ano ?? anoAtual

  if (isNaN(ano) || ano < 2020 || ano > anoAtual) {
    return NextResponse.json({ error: 'Ano inválido' }, { status: 400 })
  }

  // Passo 1 — IDs dos imóveis do usuário
  const { data: imoveis, error: errImoveis } = await supabase
    .from('imoveis')
    .select('id')
    .eq('user_id', user.id)

  if (errImoveis) {
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }

  const imovelIds = (imoveis ?? []).map(i => i.id)

  // Passo 2 — aluguéis pagos no ano
  const anoStr = String(ano)
  const registros: { mes_referencia: string; valor: number; valor_pago: number | null }[] = []

  if (imovelIds.length > 0) {
    const { data: alugueis, error } = await supabase
      .from('alugueis')
      .select('mes_referencia, valor, valor_pago')
      .in('imovel_id', imovelIds)
      .eq('status', 'pago')
      .like('mes_referencia', `${anoStr}%`)

    if (error) {
      return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
    }

    registros.push(...(alugueis ?? []).map(a => ({
      mes_referencia: a.mes_referencia,
      valor: a.valor,
      valor_pago: a.valor_pago,
    })))
  }

  const resumo = calcularResumoAnual(ano, registros)

  // ── Gera PDF com jsPDF ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { jsPDF } = require('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const W = 210
  const margin = 14
  let y = 20

  // Cabeçalho
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Relatório de Imposto de Renda', margin, y)
  y += 8

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 116, 139)
  doc.text(`Rendimentos de Aluguel · Ano-Calendário ${ano}`, margin, y)
  y += 5

  doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} · ${profile?.nome ?? ''} · ${profile?.email ?? ''}`, margin, y)
  y += 10

  // Linha separadora
  doc.setDrawColor(226, 232, 240)
  doc.line(margin, y, W - margin, y)
  y += 8

  // Cards resumo
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  doc.text('TOTAL RECEBIDO', margin, y)
  doc.text('IRPF ESTIMADO', 75, y)
  doc.text('MÉDIA MENSAL', 135, y)
  y += 5
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(formatBRL(resumo.total_bruto), margin, y)
  doc.setTextColor(109, 40, 217)
  doc.text(formatBRL(resumo.total_imposto), 75, y)
  doc.setTextColor(15, 23, 42)
  doc.text(formatBRL(resumo.media_mensal), 135, y)
  y += 10

  // Alerta carnê-leão
  if (resumo.meses_com_obrigacao > 0) {
    doc.setFillColor(255, 251, 235)
    doc.setDrawColor(253, 230, 138)
    doc.roundedRect(margin, y, W - 2 * margin, 10, 2, 2, 'FD')
    doc.setFontSize(8.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 53, 15)
    doc.text(
      `Atenção: em ${resumo.meses_com_obrigacao} mês(es) o rendimento superou R$ ${LIMITE_CARNE_LEAO_2025.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} — Carnê-Leão obrigatório.`,
      margin + 3,
      y + 6,
    )
    y += 15
  } else {
    y += 2
  }

  // Tabela mensal — header
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.rect(margin, y, W - 2 * margin, 7, 'FD')
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 116, 139)
  const cols = { mes: margin + 3, recebido: 85, irpf: 120, aliq: 150, status: 167 }
  doc.text('MÊS', cols.mes, y + 5)
  doc.text('RECEBIDO', cols.recebido, y + 5, { align: 'right' })
  doc.text('IRPF', cols.irpf, y + 5, { align: 'right' })
  doc.text('ALÍQ.', cols.aliq, y + 5, { align: 'right' })
  doc.text('STATUS', cols.status + 3, y + 5)
  y += 7

  for (const m of resumo.meses) {
    if (y > 270) { doc.addPage(); y = 20 }

    if (resumo.meses.indexOf(m) % 2 === 1) {
      doc.setFillColor(250, 250, 250)
      doc.rect(margin, y, W - 2 * margin, 7, 'F')
    }
    doc.setDrawColor(241, 245, 249)
    doc.line(margin, y + 7, W - margin, y + 7)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(m.bruto === 0 ? 148 : 51, m.bruto === 0 ? 163 : 65, m.bruto === 0 ? 175 : 85)
    doc.text(m.label, cols.mes, y + 5)

    doc.setTextColor(m.bruto === 0 ? 148 : 51, m.bruto === 0 ? 163 : 65, m.bruto === 0 ? 175 : 85)
    doc.text(m.bruto > 0 ? formatBRL(m.bruto) : '—', cols.recebido, y + 5, { align: 'right' })

    if (m.imposto > 0) {
      doc.setTextColor(109, 40, 217)
    } else {
      doc.setTextColor(148, 163, 175)
    }
    doc.text(m.imposto > 0 ? formatBRL(m.imposto) : '—', cols.irpf, y + 5, { align: 'right' })

    doc.setTextColor(100, 116, 139)
    doc.text(m.bruto > 0 ? formatPct(m.aliquota_efetiva) : '—', cols.aliq, y + 5, { align: 'right' })

    if (m.bruto > 0) {
      if (m.obrigado_carne_leao) {
        doc.setFillColor(255, 237, 213)
        doc.setDrawColor(253, 186, 116)
      } else {
        doc.setFillColor(241, 245, 249)
        doc.setDrawColor(203, 213, 225)
      }
      doc.roundedRect(cols.status, y + 1.5, 26, 4.5, 1, 1, 'FD')
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(m.obrigado_carne_leao ? 154 : 100, m.obrigado_carne_leao ? 52 : 116, m.obrigado_carne_leao ? 18 : 139)
      doc.text(m.obrigado_carne_leao ? 'Carnê-leão' : 'Isento', cols.status + 13, y + 5, { align: 'center' })
    }

    y += 7
  }

  // Rodapé totais
  y += 2
  doc.setDrawColor(226, 232, 240)
  doc.setLineWidth(0.5)
  doc.line(margin, y, W - margin, y)
  y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text('Total', cols.mes, y)
  doc.text(formatBRL(resumo.total_bruto), cols.recebido, y, { align: 'right' })
  doc.setTextColor(109, 40, 217)
  doc.text(formatBRL(resumo.total_imposto), cols.irpf, y, { align: 'right' })
  doc.setTextColor(100, 116, 139)
  doc.text(
    resumo.total_bruto > 0 ? formatPct((resumo.total_imposto / resumo.total_bruto) * 100) : '—',
    cols.aliq,
    y,
    { align: 'right' },
  )

  y += 14
  // Disclaimer
  if (y > 270) { doc.addPage(); y = 20 }
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(148, 163, 175)
  doc.text(
    'Valores estimados com base nos aluguéis registrados no ProprietárioZen. Consulte um contador para declaração oficial.',
    W / 2,
    y,
    { align: 'center', maxWidth: W - 2 * margin },
  )

  const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

  return new NextResponse(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="relatorio-ir-${ano}.pdf"`,
    },
  })
}
