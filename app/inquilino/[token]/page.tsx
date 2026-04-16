import { notFound } from 'next/navigation'
import HistoricoSection from './_components/HistoricoSection'
import DocumentosSection from './_components/DocumentosSection'

type PageProps = { params: Promise<{ token: string }> }

type DadosPagina = {
  inquilino:  { nome: string; telefone: string | null }
  imovel: {
    apelido: string; endereco: string; tipo: string
    valor_aluguel: number; dia_vencimento: number; observacoes: string | null
  } | null
  proprietario: { nome: string; telefone: string | null } | null
  proximoVencimento: {
    id: string; mes_referencia: string; valor: number
    data_vencimento: string; status: string
    data_pagamento: string | null; valor_pago: number | null
  } | null
  historico: {
    id: string; mes_referencia: string; valor: number
    data_vencimento: string; status: string
    data_pagamento: string | null; valor_pago: number | null
  }[]
  documentos: {
    id: string; tipo: string; nome_arquivo: string
    tamanho_bytes: number; mime_type: string
    descricao: string | null; criado_em: string
  }[]
}

const TIPO_IMOVEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa:        'Casa',
  kitnet:      'Kitnet',
  comercial:   'Comercial',
  terreno:     'Terreno',
  outro:       'Outro',
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

function formatarData(data: string) {
  return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR')
}

function formatarMes(mes: string) {
  const [ano, m] = mes.split('-')
  const nomes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${nomes[parseInt(m, 10) - 1]} de ${ano}`
}

export default async function InquilinoPage({ params }: PageProps) {
  const { token } = await params

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://proprietariozen.com.br'
  const res = await fetch(`${appUrl}/api/inquilino/pagina/${token}`, {
    cache: 'no-store',
  })

  if (!res.ok) notFound()

  const dados: DadosPagina = await res.json()
  const { inquilino, imovel, proprietario, proximoVencimento, historico, documentos } = dados

  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pendente: { label: 'Pendente', bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
    atrasado: { label: 'Atrasado', bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200' },
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-emerald-600 text-white px-4 py-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200 mb-1">ProprietárioZen</p>
        <h1 className="text-xl font-bold">Olá, {inquilino.nome.split(' ')[0]}!</h1>
        <p className="text-sm text-emerald-100 mt-1">Sua área do inquilino</p>
      </header>

      <div className="max-w-xl mx-auto px-4 py-6 space-y-6">

        {/* Próximo vencimento */}
        {proximoVencimento && (() => {
          const cfg = statusConfig[proximoVencimento.status] ?? statusConfig.pendente
          return (
            <section className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider mb-3 ${cfg.text}`}>
                {cfg.label} · {formatarMes(proximoVencimento.mes_referencia)}
              </p>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatarMoeda(proximoVencimento.valor)}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Vence em {formatarData(proximoVencimento.data_vencimento)}
                  </p>
                </div>
                {imovel && (
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-700">{imovel.apelido}</p>
                    <p className="text-xs text-gray-400">Dia {imovel.dia_vencimento} de cada mês</p>
                  </div>
                )}
              </div>
            </section>
          )
        })()}

        {/* Sem vencimento ativo */}
        {!proximoVencimento && (
          <section className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Tudo em dia!</p>
                <p className="text-xs text-emerald-600">Não há pagamentos pendentes no momento.</p>
              </div>
            </div>
          </section>
        )}

        {/* Histórico */}
        <HistoricoSection historico={historico} />

        {/* Documentos */}
        <DocumentosSection documentos={documentos} token={token} />

        {/* Dados do imóvel */}
        {imovel && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Dados do imóvel</h2>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              {[
                ['Imóvel',   imovel.apelido],
                ['Tipo',     TIPO_IMOVEL[imovel.tipo] ?? imovel.tipo],
                ['Endereço', imovel.endereco],
                ['Aluguel',  formatarMoeda(imovel.valor_aluguel)],
                ['Vencimento', `Dia ${imovel.dia_vencimento}`],
                ...(imovel.observacoes ? [['Observações', imovel.observacoes] as [string, string]] : []),
              ].map(([label, value]) => (
                <div key={label} className="flex gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">{label}</span>
                  <span className="text-sm text-gray-700 font-medium flex-1">{value}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Contato do proprietário */}
        {proprietario && (
          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-3">Contato do proprietário</h2>
            <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
              <div className="flex gap-3 px-4 py-3 border-b border-gray-50">
                <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">Nome</span>
                <span className="text-sm text-gray-700 font-medium">{proprietario.nome}</span>
              </div>
              {proprietario.telefone && (
                <div className="flex gap-3 px-4 py-3">
                  <span className="text-xs text-gray-400 w-24 flex-shrink-0 pt-0.5">Telefone</span>
                  <a
                    href={`https://wa.me/55${proprietario.telefone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-emerald-600 font-medium hover:text-emerald-700 transition-colors"
                  >
                    {proprietario.telefone} (WhatsApp)
                  </a>
                </div>
              )}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-gray-300 pb-4">
          Gerado por ProprietárioZen · proprietariozen.com.br
        </p>
      </div>
    </main>
  )
}
