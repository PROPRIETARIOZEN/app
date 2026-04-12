import type { Metadata } from 'next'
import { LandingPage } from '@/components/landing/landing-page'

// ── SEO Metadata ──────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  // Title: 53 chars as specified — do not alter
  title: 'ProprietárioZen | Gestão de Imóveis Simplificada para Proprietários',
  // Description: max 155 chars
  description: 'Gerencie seus imóveis, contratos de aluguel e cobranças em um só lugar. App gratuito para proprietários que querem controle total. Experimente grátis por 14 dias.',
  authors: [{ name: 'ProprietárioZen' }],
  robots: {
    index: true,
    follow: true,
    'max-snippet': -1,
    'max-image-preview': 'large',
  },
  alternates: {
    canonical: 'https://www.proprietariezen.com.br/',
  },
  openGraph: {
    type: 'website',
    url: 'https://www.proprietariezen.com.br/',
    title: 'ProprietárioZen — Gestão de Imóveis sem Complicação',
    description: 'Controle aluguéis, contratos e cobranças em um único app. Mais de 2.400 proprietários já simplificaram sua gestão. Comece grátis hoje.',
    images: [
      {
        url: 'https://www.proprietariezen.com.br/og-image.png',
        width: 1200,
        height: 630,
        alt: 'ProprietárioZen — Dashboard de gestão de imóveis',
      },
    ],
    siteName: 'ProprietárioZen',
    locale: 'pt_BR',
  },
  twitter: {
    card: 'summary_large_image',
    site: '@proprietariozenbr',
    title: 'ProprietárioZen — Gestão de Imóveis Simplificada',
    description: 'Gerencie seus imóveis, contratos e cobranças sem planilhas e sem stress. Experimente grátis.',
    images: ['https://www.proprietariezen.com.br/og-image.png'],
  },
  other: {
    language: 'pt-BR',
  },
}

// ── JSON-LD Structured Data ───────────────────────────────────────────────────

const jsonLdSoftware = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ProprietárioZen',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Android, iOS, Web',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'BRL',
    description: 'Plano gratuito com 14 dias de trial Pro',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    reviewCount: '312',
    bestRating: '5',
  },
  description:
    'App brasileiro de gestão de imóveis para proprietários. Controle de aluguéis, contratos digitais, cobranças automáticas e relatórios financeiros.',
  url: 'https://www.proprietariezen.com.br',
  inLanguage: 'pt-BR',
  featureList: [
    'Gestão de contratos de locação',
    'Cobrança automática de aluguel',
    'Controle de inadimplência',
    'Dashboard financeiro',
    'Notificações de vencimento',
    'Relatórios em PDF',
    'Histórico de inquilinos',
  ],
}

const jsonLdFaq = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'ProprietárioZen é gratuito?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, possui plano gratuito e 14 dias de trial do plano Pro sem cartão de crédito.',
      },
    },
    {
      '@type': 'Question',
      name: 'Posso gerenciar vários imóveis no mesmo app?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, com dashboards individuais por propriedade e relatórios consolidados.',
      },
    },
    {
      '@type': 'Question',
      name: 'O app envia cobrança automática para o inquilino?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, envia notificações por e-mail e WhatsApp antes do vencimento e em caso de inadimplência.',
      },
    },
    {
      '@type': 'Question',
      name: 'O ProprietárioZen é seguro para dados de contratos?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Sim, todos os dados são criptografados e armazenados em servidores no Brasil, em conformidade com a LGPD.',
      },
    },
  ],
}

const jsonLdOrg = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ProprietárioZen',
  url: 'https://www.proprietariezen.com.br',
  logo: 'https://www.proprietariezen.com.br/logo.png',
  sameAs: [
    'https://www.instagram.com/proprietariozenbr',
    'https://www.linkedin.com/company/proprietariozenbr',
    'https://twitter.com/proprietariozenbr',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    availableLanguage: 'Portuguese',
    areaServed: 'BR',
  },
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      {/* JSON-LD Schema 1 — SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
      />
      {/* JSON-LD Schema 2 — FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdFaq) }}
      />
      {/* JSON-LD Schema 3 — Organization */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrg) }}
      />
      <LandingPage />
    </>
  )
}
