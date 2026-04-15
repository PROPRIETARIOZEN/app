import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Termos de Uso | ProprietárioZen',
  description: 'Leia os Termos de Uso do ProprietárioZen antes de utilizar a plataforma de gestão de imóveis.',
  robots: { index: true, follow: true },
  alternates: { canonical: 'https://www.proprietariezen.com.br/termos-de-uso' },
}

export default function TermosDeUsoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-slate-100 bg-white sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">
            ← Voltar ao site
          </Link>
          <span className="text-xs text-slate-400">Atualizado em 15 de abril de 2025</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Termos de Uso</h1>
        <p className="text-slate-500 mb-10 text-sm">
          Estes Termos regulam o acesso e uso da plataforma <strong>ProprietárioZen</strong>. Ao criar uma conta ou utilizar a plataforma, você declara ter lido, compreendido e concordado integralmente com estes Termos. Se não concordar, não utilize o serviço.
        </p>

        <Section title="1. Definições">
          <ul className="space-y-2 list-none">
            <Item label="Plataforma">O software ProprietárioZen, acessível via web no domínio proprietariezen.com.br e eventuais aplicativos móveis associados.</Item>
            <Item label="Usuário ou Proprietário">Pessoa física ou jurídica que cria uma conta e utiliza a plataforma para gerenciar imóveis e contratos de locação.</Item>
            <Item label="Inquilino">Terceiro cujos dados são cadastrados pelo Proprietário na plataforma para fins de gestão do contrato de locação.</Item>
            <Item label="Plano Grátis">Modalidade de uso sem custo, sujeita a limites de funcionalidades.</Item>
            <Item label="Plano Master">Modalidade paga com acesso a todas as funcionalidades da plataforma, mediante assinatura mensal.</Item>
            <Item label="Conteúdo do Usuário">Todos os dados, textos, arquivos e informações inseridos pelo Usuário na plataforma.</Item>
          </ul>
        </Section>

        <Section title="2. Acesso e Cadastro">
          <p>
            O uso da plataforma requer o cadastro de uma conta válida. Ao se cadastrar, o Usuário declara que:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>As informações fornecidas são verdadeiras, completas e atualizadas;</li>
            <li>É maior de 18 anos ou possui capacidade civil plena para contratar;</li>
            <li>Possui plena autoridade para firmar este contrato em seu próprio nome ou em nome da pessoa jurídica que representa;</li>
            <li>Manterá a confidencialidade de suas credenciais de acesso, sendo responsável por toda atividade realizada em sua conta.</li>
          </ul>
          <p className="mt-3">
            O ProprietárioZen reserva-se o direito de recusar cadastros, suspender ou encerrar contas a seu exclusivo critério, especialmente em caso de violação destes Termos.
          </p>
        </Section>

        <Section title="3. Planos, Preços e Pagamento">
          <p>
            A plataforma oferece dois planos de uso:
          </p>
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 p-4">
              <p className="font-bold text-slate-800 mb-1">Plano Grátis</p>
              <p className="text-slate-500 text-xs">Acesso a funcionalidades básicas de gestão de imóveis, sem custo. Sujeito a limites de imóveis e funcionalidades conforme especificado na plataforma.</p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="font-bold text-slate-800 mb-1">Plano Master — R$ 49,90/mês</p>
              <p className="text-slate-500 text-xs">Acesso completo a todas as funcionalidades, incluindo cobranças automáticas, relatórios e suporte prioritário.</p>
            </div>
          </div>
          <ul className="mt-4 space-y-1.5 list-disc list-inside text-slate-600">
            <li>O pagamento é processado via <strong>Stripe</strong>, com renovação automática mensal;</li>
            <li>O cancelamento pode ser feito a qualquer momento e terá efeito ao final do período já pago;</li>
            <li>Não há reembolso proporcional por cancelamento antecipado dentro do ciclo vigente, exceto nos casos previstos no Código de Defesa do Consumidor;</li>
            <li>O ProprietárioZen pode alterar os preços mediante aviso prévio de <strong>30 dias</strong>. Caso não concorde, o Usuário pode cancelar a assinatura antes da data de vigência do novo valor;</li>
            <li>Cobranças não pagas podem resultar na suspensão do acesso ao plano pago e rebaixamento para o plano gratuito.</li>
          </ul>
        </Section>

        <Section title="4. Uso Permitido e Vedações">
          <p>A plataforma destina-se exclusivamente à gestão legítima de imóveis e contratos de locação. É expressamente vedado:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>Utilizar a plataforma para fins ilegais, fraudulentos ou que violem direitos de terceiros;</li>
            <li>Cadastrar dados falsos de imóveis, contratos ou inquilinos;</li>
            <li>Realizar engenharia reversa, descompilar ou tentar extrair o código-fonte da plataforma;</li>
            <li>Utilizar bots, scrapers ou qualquer mecanismo automatizado para acessar a plataforma sem autorização prévia;</li>
            <li>Tentar comprometer a segurança, disponibilidade ou integridade do sistema;</li>
            <li>Revender, sublicenciar ou ceder o acesso à plataforma a terceiros sem autorização;</li>
            <li>Cadastrar dados de inquilinos sem ter base legal para tal tratamento, conforme a LGPD.</li>
          </ul>
          <p className="mt-3">
            O descumprimento dessas vedações pode acarretar o encerramento imediato da conta, sem direito a reembolso, e responsabilização civil e criminal nos termos da lei.
          </p>
        </Section>

        <Section title="5. Conteúdo do Usuário">
          <p>
            O Usuário é o único e exclusivo responsável por todo o Conteúdo que inserir na plataforma, incluindo dados de imóveis, contratos e inquilinos. O ProprietárioZen:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>Não verifica nem valida a veracidade, legalidade ou adequação do Conteúdo do Usuário;</li>
            <li>Não se responsabiliza por erros, omissões ou informações inverídicas inseridas pelo Usuário;</li>
            <li>Não se responsabiliza por conflitos entre proprietário e inquilino originados ou relacionados ao uso da plataforma;</li>
            <li>Pode remover Conteúdo que viole estes Termos ou a legislação aplicável.</li>
          </ul>
          <p className="mt-3">
            O Usuário concede ao ProprietárioZen licença limitada, não exclusiva, para processar e armazenar o Conteúdo estritamente para fins de prestação do serviço.
          </p>
        </Section>

        <Section title="6. Serviços de Terceiros — Asaas">
          <p>
            A funcionalidade de cobrança automática (PIX e boleto) é operada pela <strong>Asaas Gestão Financeira S.A.</strong>, empresa independente regulamentada pelo Banco Central do Brasil. Ao ativar essa funcionalidade:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>Você aceita os Termos de Uso e a Política de Privacidade da Asaas;</li>
            <li>O ProprietárioZen atua como plataforma intermediária e não é parte nas transações financeiras;</li>
            <li>O ProprietárioZen não se responsabiliza por falhas, atrasos, recusas ou erros ocorridos no processamento pela Asaas;</li>
            <li>As chaves de API da Asaas são armazenadas de forma criptografada (AES-256-GCM), mas a guarda das credenciais é responsabilidade do Usuário;</li>
            <li>O Usuário é responsável por garantir que os dados dos inquilinos utilizados nas cobranças estejam corretos e tenham sido obtidos de forma lícita.</li>
          </ul>
        </Section>

        <Section title="7. Disponibilidade e Nível de Serviço">
          <p>
            O ProprietárioZen envidarás melhores esforços para manter a plataforma disponível 24 horas por dia, 7 dias por semana. Contudo, o serviço é fornecido <strong>&ldquo;no estado em que se encontra&rdquo; (as-is)</strong>, sem garantia de disponibilidade ininterrupta. O ProprietárioZen não se responsabiliza por:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>Interrupções causadas por manutenção programada (com aviso prévio quando possível);</li>
            <li>Falhas em serviços de infraestrutura de terceiros (Supabase, AWS, Vercel, Stripe, Asaas);</li>
            <li>Eventos de força maior, caso fortuito, ataques cibernéticos de grande escala ou qualquer circunstância fora do controle razoável da plataforma;</li>
            <li>Perda de dados decorrente de falhas técnicas não atribuíveis a negligência do ProprietárioZen.</li>
          </ul>
        </Section>

        <Section title="8. Limitação de Responsabilidade">
          <p>
            Na máxima extensão permitida pela legislação aplicável:
          </p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>O ProprietárioZen não será responsável por danos indiretos, incidentais, especiais, punitivos ou consequentes, incluindo lucros cessantes, perda de dados ou danos à reputação;</li>
            <li>A responsabilidade total do ProprietárioZen em relação ao Usuário, por qualquer causa, fica limitada ao valor efetivamente pago pelo Usuário nos <strong>3 meses anteriores</strong> ao evento que originou o dano;</li>
            <li>Usuários do plano gratuito reconhecem que utilizam o serviço sem contrapartida financeira, assumindo os riscos inerentes;</li>
            <li>O ProprietárioZen não presta assessoria jurídica, fiscal ou contábil. Qualquer decisão tomada com base nas informações da plataforma é de inteira responsabilidade do Usuário.</li>
          </ul>
        </Section>

        <Section title="9. Propriedade Intelectual">
          <p>
            Todos os direitos de propriedade intelectual da plataforma — incluindo código-fonte, design, marcas, logotipos, textos e funcionalidades — pertencem exclusivamente ao ProprietárioZen e são protegidos pela legislação brasileira de direitos autorais e propriedade industrial.
          </p>
          <p className="mt-3">
            É vedada a reprodução, distribuição, modificação ou uso comercial de qualquer elemento da plataforma sem autorização prévia e por escrito. A licença concedida ao Usuário é limitada ao uso pessoal e não comercial da plataforma para os fins descritos nestes Termos.
          </p>
        </Section>

        <Section title="10. Privacidade e LGPD">
          <p>
            O tratamento de dados pessoais no âmbito da plataforma é regido pela nossa{' '}
            <Link href="/politica-de-privacidade" className="text-emerald-700 underline underline-offset-2">Política de Privacidade</Link>,
            que integra estes Termos por referência. O Usuário compromete-se a utilizar os dados de inquilinos cadastrados na plataforma em conformidade com a LGPD e demais normas aplicáveis.
          </p>
        </Section>

        <Section title="11. Suspensão e Encerramento">
          <p>O Usuário pode encerrar sua conta a qualquer momento nas configurações da plataforma. O ProprietárioZen pode suspender ou encerrar contas nas seguintes hipóteses:</p>
          <ul className="mt-3 space-y-1.5 list-disc list-inside text-slate-600">
            <li>Violação destes Termos ou da Política de Privacidade;</li>
            <li>Inadimplemento no pagamento da assinatura;</li>
            <li>Uso da plataforma para fins ilícitos ou fraudulentos;</li>
            <li>Determinação de autoridade competente;</li>
            <li>Inatividade prolongada da conta (superior a 12 meses), com aviso prévio por e-mail.</li>
          </ul>
          <p className="mt-3">
            Após o encerramento, os dados do Usuário serão mantidos pelo período necessário ao cumprimento de obrigações legais, conforme descrito na Política de Privacidade.
          </p>
        </Section>

        <Section title="12. Alterações nos Termos">
          <p>
            O ProprietárioZen pode modificar estes Termos a qualquer momento. Alterações materiais serão comunicadas por e-mail e/ou aviso na plataforma com antecedência mínima de <strong>15 dias</strong>. O uso continuado após a vigência das alterações constitui aceite tácito dos novos termos. Caso não concorde, o Usuário pode encerrar sua conta antes da data de vigência.
          </p>
        </Section>

        <Section title="13. Disposições Gerais">
          <ul className="space-y-2 list-disc list-inside text-slate-600">
            <li><strong>Lei aplicável:</strong> Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo o Código Civil, o Código de Defesa do Consumidor (Lei nº 8.078/1990) e a LGPD (Lei nº 13.709/2018).</li>
            <li><strong>Foro:</strong> As partes elegem o foro da Comarca de São Paulo — SP para dirimir quaisquer controvérsias decorrentes destes Termos, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</li>
            <li><strong>Integralidade:</strong> Estes Termos, juntamente com a Política de Privacidade, constituem o acordo integral entre as partes quanto ao uso da plataforma.</li>
            <li><strong>Nulidade parcial:</strong> Caso qualquer disposição seja declarada nula ou inexequível, as demais disposições permanecerão em pleno vigor.</li>
            <li><strong>Não renúncia:</strong> A omissão do ProprietárioZen em exigir o cumprimento de qualquer disposição não constituirá renúncia a esse direito.</li>
          </ul>
        </Section>

        <Section title="14. Contato">
          <p>
            Para dúvidas, solicitações ou notificações relacionadas a estes Termos, entre em contato pelo e-mail:{' '}
            <a href="mailto:contato@proprietariezen.com.br" className="text-emerald-700 underline underline-offset-2">contato@proprietariezen.com.br</a>.
          </p>
        </Section>

        <div className="mt-12 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Última atualização: 15 de abril de 2025</p>
          <div className="flex gap-4 text-xs">
            <Link href="/politica-de-privacidade" className="text-emerald-700 hover:text-emerald-800 underline underline-offset-2">Política de Privacidade</Link>
            <Link href="/" className="text-slate-400 hover:text-slate-600">← Voltar ao site</Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-bold text-slate-800 mb-3 pb-2 border-b border-slate-100">{title}</h2>
      <div className="text-slate-600 leading-relaxed space-y-2 text-sm">{children}</div>
    </section>
  )
}

function Item({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-2 text-sm">
      <span className="text-emerald-600 font-semibold shrink-0 mt-0.5">→</span>
      <span><strong className="text-slate-700">{label}:</strong> {children}</span>
    </li>
  )
}
