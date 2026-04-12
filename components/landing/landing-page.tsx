'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LogoColor, LogoWhite } from '@/components/ui/logo'

// ─── App mockup SVG ──────────────────────────────────────────────────────────

function AppMockup() {
  return (
    <svg
      width="300"
      height="560"
      viewBox="0 0 300 560"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-2xl"
      role="img"
      aria-label="Interface do app ProprietárioZen mostrando o painel de gestão de imóveis com recebimentos e inquilinos"
    >
      <rect width="300" height="560" rx="32" fill="#1E293B" />
      <rect x="6" y="6" width="288" height="548" rx="27" fill="#0F172A" />
      <rect x="10" y="10" width="280" height="540" rx="24" fill="#F8FAFC" />
      {/* Header */}
      <rect x="10" y="10" width="280" height="54" rx="24" fill="#059669" />
      <rect x="10" y="34" width="280" height="30" fill="#059669" />
      <text x="30" y="42" fontFamily="Inter,sans-serif" fontSize="13" fontWeight="700" fill="white">Dashboard</text>
      <text x="200" y="42" fontFamily="Inter,sans-serif" fontSize="10" fill="rgba(255,255,255,0.65)">Abril 2025</text>
      {/* Notch */}
      <rect x="105" y="10" width="90" height="20" rx="10" fill="#0F172A" />
      {/* Stat cards */}
      <rect x="18" y="72" width="124" height="66" rx="12" fill="white" />
      <rect x="18" y="72" width="124" height="2" rx="1" fill="#D1FAE5" />
      <text x="30" y="90" fontFamily="Inter,sans-serif" fontSize="8" fill="#94A3B8" fontWeight="600">RECEBIDO</text>
      <text x="30" y="112" fontFamily="Inter,sans-serif" fontSize="17" fontWeight="700" fill="#0F172A">R$ 5.400</text>
      <text x="30" y="128" fontFamily="Inter,sans-serif" fontSize="8" fill="#059669">↑ 3 pagamentos</text>
      <rect x="154" y="72" width="128" height="66" rx="12" fill="white" />
      <rect x="154" y="72" width="128" height="2" rx="1" fill="#FEF3C7" />
      <text x="166" y="90" fontFamily="Inter,sans-serif" fontSize="8" fill="#94A3B8" fontWeight="600">PENDENTE</text>
      <text x="166" y="112" fontFamily="Inter,sans-serif" fontSize="17" fontWeight="700" fill="#0F172A">R$ 1.800</text>
      <text x="166" y="128" fontFamily="Inter,sans-serif" fontSize="8" fill="#F59E0B">1 aguardando</text>
      <rect x="18" y="148" width="124" height="66" rx="12" fill="white" />
      <text x="30" y="166" fontFamily="Inter,sans-serif" fontSize="8" fill="#94A3B8" fontWeight="600">EM ATRASO</text>
      <text x="30" y="188" fontFamily="Inter,sans-serif" fontSize="17" fontWeight="700" fill="#EF4444">R$ 0</text>
      <text x="30" y="204" fontFamily="Inter,sans-serif" fontSize="8" fill="#94A3B8">Tudo em dia ✓</text>
      <rect x="154" y="148" width="128" height="66" rx="12" fill="white" />
      <text x="166" y="166" fontFamily="Inter,sans-serif" fontSize="8" fill="#94A3B8" fontWeight="600">IMÓVEIS</text>
      <text x="166" y="192" fontFamily="Inter,sans-serif" fontSize="22" fontWeight="700" fill="#0F172A">4</text>
      <text x="166" y="206" fontFamily="Inter,sans-serif" fontSize="8" fill="#94A3B8">cadastrados</text>
      {/* Section label */}
      <text x="18" y="236" fontFamily="Inter,sans-serif" fontSize="8" fontWeight="600" fill="#94A3B8" letterSpacing="0.08em">REGISTROS DO MÊS</text>
      {/* List items */}
      {[
        { y: 246, initials: 'MC', color: '#D1FAE5', textColor: '#059669', name: 'Maria Costa', sub: 'Apto 101', badge: 'Pago', badgeBg: '#D1FAE5', badgeText: '#065F46' },
        { y: 306, initials: 'JS', color: '#FEF3C7', textColor: '#D97706', name: 'João Silva', sub: 'Casa 2', badge: 'Pendente', badgeBg: '#FEF3C7', badgeText: '#92400E' },
        { y: 366, initials: 'AL', color: '#D1FAE5', textColor: '#059669', name: 'Ana Lima', sub: 'Apto 203', badge: 'Pago', badgeBg: '#D1FAE5', badgeText: '#065F46' },
      ].map(({ y, initials, color, textColor, name, sub, badge, badgeBg, badgeText }) => (
        <g key={y}>
          <rect x="18" y={y} width="264" height="50" rx="10" fill="white" />
          <circle cx="43" cy={y + 25} r="13" fill={color} />
          <text x={initials.length === 2 ? 37 : 39} y={y + 29} fontFamily="Inter,sans-serif" fontSize="9" fontWeight="700" fill={textColor}>{initials}</text>
          <text x="63" y={y + 18} fontFamily="Inter,sans-serif" fontSize="11" fontWeight="600" fill="#0F172A">{name}</text>
          <text x="63" y={y + 33} fontFamily="Inter,sans-serif" fontSize="9" fill="#94A3B8">{sub}</text>
          <rect x={badge === 'Pendente' ? 213 : 224} y={y + 16} width={badge === 'Pendente' ? 55 : 44} height="18" rx="9" fill={badgeBg} />
          <text x={badge === 'Pendente' ? 219 : 230} y={y + 28} fontFamily="Inter,sans-serif" fontSize="8" fontWeight="600" fill={badgeText}>{badge}</text>
        </g>
      ))}
      {/* Bottom nav */}
      <rect x="10" y="492" width="280" height="58" rx="24" fill="white" />
      {[
        { x: 42, label: 'Dashboard', active: true },
        { x: 102, label: 'Imóveis', active: false },
        { x: 158, label: 'Inquilinos', active: false },
        { x: 216, label: 'Aluguéis', active: false },
      ].map(({ x, label, active }) => (
        <g key={label}>
          <circle cx={x + 10} cy={510} r="4" fill={active ? '#059669' : '#E2E8F0'} />
          <text x={x} y={530} fontFamily="Inter,sans-serif" fontSize="7" fill={active ? '#059669' : '#94A3B8'} fontWeight={active ? '600' : '400'}>{label}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── Feature cards data ───────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
    title: 'Controle de aluguel',
    desc: 'Acompanhe pagamentos, vencimentos e status em tempo real, com resumo financeiro mensal automático.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
    title: 'Gerenciar contratos de locação',
    desc: 'Cadastre contratos com vigência e reajuste automático por IGPM ou IPCA — sem precisar lembrar.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
    title: 'Dashboard financeiro',
    desc: 'Controle de inadimplência de aluguel: visualize recebidos, pendentes e locatários em atraso num painel limpo.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
    title: 'Cobrar inquilino automaticamente',
    desc: 'E-mails automáticos antes do vencimento, no atraso e na data de reajuste. Sem você precisar fazer nada.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
    title: 'Gestão de inquilinos',
    desc: 'Histórico completo: dados de contato, período de locação e registro de todos os pagamentos do locatário.',
  },
  {
    icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>,
    title: 'Recibos PDF',
    desc: 'Gere recibos profissionais em PDF com 1 clique — com seus dados e do inquilino, prontos para enviar.',
  },
]

// ─── FAQ data ─────────────────────────────────────────────────────────────────

const FAQ = [
  {
    q: 'Como gerenciar imóveis sem imobiliária?',
    a: 'Com o ProprietárioZen, você faz toda a gestão de imóveis diretamente no app, sem depender de imobiliária. Centralize contratos de locação, cobranças automáticas de aluguel, reajustes e recibos PDF num único painel.',
  },
  {
    q: 'O app funciona para proprietário de apartamento para alugar?',
    a: 'Sim! O ProprietárioZen é o app ideal para proprietário de apartamento, casa ou qualquer imóvel para alugar. Você gerencia um ou vários imóveis no mesmo painel, com dashboards individuais por propriedade.',
  },
  {
    q: 'Como cobrar aluguel automaticamente pelo celular?',
    a: 'Basta cadastrar o contrato e a data de vencimento. O app para proprietários envia notificações automáticas por e-mail para o locatário antes do vencimento e em caso de inadimplência — sem você precisar fazer nada.',
  },
  {
    q: 'Qual é o melhor app para controlar aluguel no Brasil?',
    a: 'O ProprietárioZen está entre os mais completos softwares para proprietário de imóvel no mercado. Gestão de imóveis grátis para começar, controle de inadimplência, reajuste automático por IGPM/IPCA, app de aluguel Brasil — tudo em um lugar.',
  },
]

// ─── Main component ───────────────────────────────────────────────────────────

export function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const els = document.querySelectorAll('.lp-fade')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('lp-visible'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.1 })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <style>{`
        html { scroll-behavior: smooth; }
        .lp-fade { opacity: 0; transform: translateY(22px); transition: opacity .6s ease, transform .6s ease; }
        .lp-fade.lp-visible { opacity: 1; transform: translateY(0); }
        .lp-delay-1 { transition-delay: .1s; }
        .lp-delay-2 { transition-delay: .2s; }
        .lp-delay-3 { transition-delay: .3s; }
        .lp-delay-4 { transition-delay: .4s; }
        .lp-delay-5 { transition-delay: .5s; }
        @keyframes lp-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-18px); } }
        .lp-float { animation: lp-float 6s ease-in-out infinite; }
        @keyframes lp-badge { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .lp-badge-1 { animation: lp-badge 6s ease-in-out infinite; }
        .lp-badge-2 { animation: lp-badge 6s ease-in-out 2s infinite; }
        .lp-badge-3 { animation: lp-badge 6s ease-in-out 4s infinite; }
        @keyframes lp-blink { 0%,100% { opacity:1; } 50% { opacity:.25; } }
        .lp-blink { animation: lp-blink 2s ease-in-out infinite; }
        @keyframes lp-blob { 0%,100% { transform:translate(0,0) scale(1); } 33% { transform:translate(24px,-24px) scale(1.06); } 66% { transform:translate(-16px,12px) scale(.97); } }
        .lp-blob-1 { animation: lp-blob 8s ease-in-out infinite; }
        .lp-blob-2 { animation: lp-blob 11s ease-in-out reverse infinite; }
        .lp-card { transition: transform .25s ease, box-shadow .25s ease; }
        .lp-card:hover { transform: translateY(-6px); box-shadow: 0 20px 48px rgba(5,150,105,.12); }
      `}</style>

      {/* ── HEADER / NAVBAR ── */}
      <header role="banner">
        <nav aria-label="Navegação principal" className="sticky top-0 z-50 bg-white/96 backdrop-blur-md border-b border-[#D1FAE5]">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <LogoColor href="/" iconSize={36} />
            <ul className="hidden md:flex items-center gap-8 list-none m-0 p-0">
              {[['#funcionalidades','Funcionalidades'],['#como-funciona','Como funciona'],['#depoimentos','Depoimentos'],['#precos','Preços']].map(([href,label]) => (
                <li key={href}><a href={href} className="text-[#374151] hover:text-[#059669] font-medium text-sm transition-colors">{label}</a></li>
              ))}
            </ul>
            <div className="hidden md:flex items-center gap-3">
              <Link href="/login" className="text-sm font-semibold text-[#374151] hover:text-[#059669] px-4 py-2 transition-colors">Entrar</Link>
              <Link href="/cadastro" className="bg-[#059669] hover:bg-[#047857] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:-translate-y-px shadow-sm">Começar gestão gratuita</Link>
            </div>
            <button
              className="md:hidden p-2 rounded-lg hover:bg-[#F0FDF4]"
              onClick={() => setMobileOpen(v => !v)}
              aria-label={mobileOpen ? 'Fechar menu de navegação' : 'Abrir menu de navegação'}
              aria-expanded={mobileOpen}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          </div>
          {mobileOpen && (
            <div className="md:hidden border-t border-[#D1FAE5] bg-white px-6 py-4 flex flex-col gap-1">
              {[['#funcionalidades','Funcionalidades'],['#como-funciona','Como funciona'],['#depoimentos','Depoimentos'],['#precos','Preços']].map(([href,label]) => (
                <a key={href} href={href} onClick={() => setMobileOpen(false)} className="text-[#374151] font-medium py-2.5 text-base">{label}</a>
              ))}
              <div className="flex gap-3 mt-3 pt-3 border-t border-[#F1F5F9]">
                <Link href="/login" className="flex-1 text-center border border-[#D1FAE5] text-[#059669] font-semibold py-2.5 rounded-xl text-sm">Entrar</Link>
                <Link href="/cadastro" className="flex-1 text-center bg-[#059669] text-white font-semibold py-2.5 rounded-xl text-sm">Começar grátis</Link>
              </div>
            </div>
          )}
        </nav>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main id="main-content">

        {/* ── HERO ── */}
        <section id="hero" aria-labelledby="hero-title" className="relative overflow-hidden" style={{background:'linear-gradient(135deg,#022C22 0%,#033D2C 55%,#044D38 100%)',padding:'88px 0 108px'}}>
          <div className="absolute -top-40 -right-20 w-[520px] h-[520px] rounded-full opacity-[0.055]" style={{background:'#34D399'}} aria-hidden="true" />
          <div className="absolute -bottom-24 -left-12 w-[300px] h-[300px] rounded-full opacity-[0.055]" style={{background:'#34D399'}} aria-hidden="true" />
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full text-[#34D399] text-xs font-semibold" style={{background:'rgba(52,211,153,0.12)',border:'1px solid rgba(52,211,153,0.25)'}}>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#34D399] lp-blink" aria-hidden="true" />
                  Recibos PDF automáticos — novidade
                </div>
                <h1 id="hero-title" className="text-[52px] lg:text-[60px] font-bold text-white leading-[1.1] mb-6">
                  Gestão de imóveis<br />para proprietários <span className="text-[#34D399]">sem planilha,<br />sem estresse.</span>
                </h1>
                <p className="text-[17px] text-white/60 mb-10 leading-[1.75] max-w-[420px]">
                  O melhor app para proprietários fazerem controle de aluguel, inquilinos e cobranças num só lugar. Alertas automáticos de vencimento e recibos profissionais com 1 clique.
                </p>
                <div className="flex flex-wrap gap-4 mb-12">
                  <Link href="/cadastro" className="inline-flex items-center gap-2.5 bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-7 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(16,185,129,0.35)] text-[15px]">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    Começar gestão gratuita agora
                  </Link>
                  <a href="#como-funciona" className="inline-flex items-center gap-2 font-semibold px-7 py-3.5 rounded-xl transition-all hover:-translate-y-0.5 text-white text-[15px]" style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)'}}>
                    Ver como funciona →
                  </a>
                </div>
                <div className="flex gap-10">
                  {[['2.400+','Proprietários ativos'],['R$ 0','Para começar'],['98%','Satisfação']].map(([v,l]) => (
                    <div key={l}><p className="text-2xl font-bold text-white">{v}</p><p className="text-xs text-white/40 mt-0.5">{l}</p></div>
                  ))}
                </div>
              </div>
              {/* Mockup */}
              <div className="relative flex justify-center">
                <div className="lp-float relative">
                  <div className="lp-badge-1 absolute top-[10%] -left-[28%] bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 z-10 hidden lg:flex" aria-hidden="true">
                    <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] flex items-center justify-center shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div><p className="text-[10px] text-[#94A3B8] leading-none mb-1">Aluguel recebido</p><p className="text-[13px] font-bold text-[#059669]">+R$ 1.800</p></div>
                  </div>
                  <div className="lp-badge-2 absolute bottom-[30%] -right-[22%] bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 z-10 hidden lg:flex" aria-hidden="true">
                    <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] flex items-center justify-center shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <div><p className="text-[10px] text-[#94A3B8] leading-none mb-1">Vence em 3 dias</p><p className="text-[13px] font-bold text-[#D97706]">Apto 302</p></div>
                  </div>
                  <div className="lp-badge-3 absolute top-[55%] -left-[32%] bg-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 z-10 hidden lg:flex" aria-hidden="true">
                    <div className="w-8 h-8 rounded-lg bg-[#D1FAE5] flex items-center justify-center shrink-0">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    </div>
                    <div><p className="text-[10px] text-[#94A3B8] leading-none mb-1">Recibo gerado</p><p className="text-[13px] font-bold text-[#059669]">Abril 2025 ✓</p></div>
                  </div>
                  <AppMockup />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── SOCIAL PROOF ── */}
        <section aria-label="Mais de 2.400 proprietários de imóveis confiam no ProprietárioZen" className="py-10 bg-[#F0FDF4] border-y border-[#D1FAE5]">
          <div className="max-w-6xl mx-auto px-6">
            <p className="text-center text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-8">Confiado por proprietários em todo o Brasil</p>
            <div className="flex flex-wrap items-center justify-center gap-10 opacity-50" aria-hidden="true">
              {[
                [<svg key="v" width="16" height="16" viewBox="0 0 24 24" fill="#374151"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21" stroke="#374151" strokeWidth="2"/><line x1="12" y1="17" x2="12" y2="21" stroke="#374151" strokeWidth="2"/></svg>,'VivaReal'],
                [<svg key="z" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>,'ZAP Imóveis'],
                [<svg key="s" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,'Stripe'],
                [<svg key="m" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>,'Mailgun'],
                [<svg key="sp" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,'Supabase'],
              ].map(([icon, name]) => (
                <div key={name as string} className="flex items-center gap-2 font-bold text-[17px] text-[#374151]">
                  {icon}{name}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="funcionalidades" aria-labelledby="funcionalidades-title" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Funcionalidades</span>
              <h2 id="funcionalidades-title" className="text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3 mb-4">
                Tudo para a sua gestão de imóveis<br />sem complicação.
              </h2>
              <p className="text-[17px] text-[#6B7280] max-w-lg leading-relaxed">Software para proprietário de imóvel que dispensa planilhas, papéis e surpresas.</p>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {FEATURES.map(({ icon, title, desc }, i) => (
                <div key={title} className={`lp-fade lp-delay-${i % 3 === 0 ? 0 : i % 3} lp-card bg-white rounded-2xl border border-[#E5F7F0] p-8 cursor-default`}>
                  <div className="w-12 h-12 bg-[#F0FDF4] rounded-[14px] flex items-center justify-center mb-5">{icon}</div>
                  <h3 className="font-semibold text-[#1F2937] text-[16px] mb-2">{title}</h3>
                  <p className="text-sm text-[#6B7280] leading-[1.75]">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="como-funciona" aria-labelledby="como-funciona-title" className="py-24 bg-[#F0FDF4]">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Como funciona</span>
              <h2 id="como-funciona-title" className="text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3">Comece a usar em minutos</h2>
              <p className="text-[17px] text-[#6B7280] mt-3 max-w-md mx-auto">Sem instalação, sem configuração complicada. O app de aluguel Brasil que qualquer proprietário consegue usar.</p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { n:'01', icon:<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>, title:'Crie sua conta grátis', desc:'Cadastro gratuito em menos de 1 minuto. Só precisa do seu e-mail — sem cartão de crédito.' },
                { n:'02', icon:<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, title:'Cadastre seus imóveis', desc:'Adicione imóveis e vincule os inquilinos. O app organiza sua gestão automaticamente.' },
                { n:'03', icon:<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>, title:'Receba no prazo', desc:'Acompanhe pagamentos, receba alertas e gere recibos com 1 clique. Controle de aluguel total.' },
              ].map(({ n, icon, title, desc }, i) => (
                <div key={n} className={`lp-fade lp-delay-${i} text-center relative`}>
                  {i < 2 && (
                    <div className="hidden md:block absolute top-10 left-[calc(50%+44px)] w-[calc(100%-44px)] overflow-hidden" style={{height:'2px',background:'repeating-linear-gradient(90deg,#10B981 0,#10B981 6px,transparent 6px,transparent 14px)'}} aria-hidden="true" />
                  )}
                  <div className="relative flex justify-center mb-6">
                    <div className="w-20 h-20 bg-white rounded-full border-[3px] border-[#10B981] flex items-center justify-center shadow-sm">{icon}</div>
                    <span className="absolute -top-2 left-[calc(50%+28px)] w-6 h-6 rounded-full bg-[#059669] text-white text-[11px] font-bold flex items-center justify-center" aria-hidden="true">{n}</span>
                  </div>
                  <h3 className="text-[17px] font-semibold text-[#1F2937] mb-2">{title}</h3>
                  <p className="text-[14px] text-[#6B7280] leading-relaxed max-w-[200px] mx-auto">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TESTIMONIALS ── */}
        <section id="depoimentos" aria-labelledby="depoimentos-title" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Depoimentos</span>
              <h2 id="depoimentos-title" className="text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3">O que dizem nossos proprietários</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { initials:'CR', bg:'#D1FAE5', fg:'#065F46', name:'Carlos Ribeiro', city:'São Paulo, SP — 3 imóveis', text:'"Eu controlava tudo por planilha do Excel e era um caos. Com o ProprietárioZen passei a receber em dia porque os alertas chegam antes do vencimento. Simples assim."', delay:'0' },
                { initials:'MA', bg:'#FEF3C7', fg:'#92400E', name:'Márcia Alves', city:'Belo Horizonte, MG — 4 imóveis', text:'"Tenho 4 imóveis alugados e vivia esquecendo de cobrar alguém. Agora o sistema avisa e ainda gero o recibo na hora. Economizo pelo menos 2 horas por mês."', delay:'1' },
                { initials:'FS', bg:'#D1FAE5', fg:'#065F46', name:'Fernando Santos', city:'Curitiba, PR — 2 imóveis', text:'"O que mais me surpreendeu foi o recibo PDF. Antes mandava um comprovante feito no Word. Agora é profissional, com todos os dados certinhos. Vale muito."', delay:'2' },
              ].map(({ initials, bg, fg, name, city, text, delay }) => (
                <article key={name} className={`lp-fade lp-delay-${delay} lp-card bg-white rounded-2xl border border-[#E5F7F0] p-8`}>
                  <div className="flex gap-0.5 mb-5" aria-label="Avaliação 5 estrelas" role="img">
                    {Array.from({length:5}).map((_,i) => <span key={i} className="text-[#F59E0B] text-base" aria-hidden="true">★</span>)}
                  </div>
                  <p className="text-[14px] text-[#374151] leading-[1.85] mb-6 italic">{text}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{background:bg,color:fg}} aria-hidden="true">{initials}</div>
                    <div><p className="text-sm font-semibold text-[#1F2937]">{name}</p><p className="text-xs text-[#6B7280] mt-0.5">{city}</p></div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── COMPARISON ── */}
        <section aria-labelledby="comparacao-title" className="py-24" style={{background:'linear-gradient(135deg,#022C22 0%,#033D2C 100%)'}}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#34D399] uppercase tracking-widest">Diferenciais</span>
              <h2 id="comparacao-title" className="text-[40px] font-bold text-white leading-[1.2] mt-3">Chega de improvisar</h2>
              <p className="text-[17px] mt-3 max-w-md mx-auto" style={{color:'rgba(255,255,255,0.55)'}}>Veja por que proprietários trocam planilhas e imobiliárias pelo ProprietárioZen.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="lp-fade rounded-2xl p-10" style={{background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)'}}>
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2" style={{color:'rgba(255,255,255,0.65)'}}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Gestão manual ou imobiliária
                </h3>
                {[
                  'Planilhas manuais que viram bagunça',
                  'Esquece de cobrar inquilino, perde dinheiro',
                  'Recibos feitos no Word sem padrão',
                  'Reajuste depende de você lembrar e calcular',
                  'Dados espalhados em e-mail e caderno',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3 mb-4">
                    <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                    <span className="text-[14px]" style={{color:'rgba(255,255,255,0.6)'}}>{item}</span>
                  </div>
                ))}
              </div>
              <div className="lp-fade lp-delay-1 rounded-2xl p-10 relative overflow-hidden" style={{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.35)'}}>
                <div className="absolute top-0 left-0 right-0 h-[3px]" style={{background:'linear-gradient(90deg,#10B981,#34D399)'}} aria-hidden="true" />
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                  ProprietárioZen
                </h3>
                {[
                  'Dashboard organizado com visão de tudo',
                  'Alertas automáticos por e-mail no vencimento',
                  'Recibos PDF profissionais em 1 clique',
                  'Reajuste automático por IGPM ou IPCA',
                  'Tudo centralizado, acessível de qualquer lugar',
                ].map(item => (
                  <div key={item} className="flex items-start gap-3 mb-4">
                    <svg className="shrink-0 mt-0.5" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                    <span className="text-[14px] text-white/90">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section id="faq" aria-labelledby="faq-title" className="py-24 bg-[#F8FAFC]">
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-14 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Dúvidas frequentes</span>
              <h2 id="faq-title" className="text-[36px] font-bold text-[#1F2937] leading-[1.2] mt-3">Perguntas frequentes</h2>
              <p className="text-[16px] text-[#6B7280] mt-3">Tudo que você precisa saber sobre a gestão de imóveis grátis.</p>
            </div>
            <dl className="space-y-4">
              {FAQ.map(({ q, a }, i) => (
                <div key={q} className={`lp-fade lp-delay-${i % 3} bg-white rounded-2xl border border-[#E5F7F0] p-6`}>
                  <dt className="font-semibold text-[#1F2937] text-[15px] mb-2">{q}</dt>
                  <dd className="text-sm text-[#6B7280] leading-[1.75]">{a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section id="precos" aria-labelledby="precos-title" className="py-24">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16 lp-fade">
              <span className="text-xs font-semibold text-[#059669] uppercase tracking-widest">Preços</span>
              <h2 id="precos-title" className="text-[40px] font-bold text-[#1F2937] leading-[1.2] mt-3">Simples e transparente</h2>
              <p className="text-[17px] text-[#6B7280] mt-3">Sem taxa de adesão. Sem fidelidade. Cancele quando quiser.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              {/* Free */}
              <div className="lp-fade lp-card bg-white rounded-2xl border-2 border-[#E5F7F0] p-10">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-widest mb-2">Grátis</p>
                <div className="flex items-baseline gap-1 mb-1"><span className="text-[42px] font-bold text-[#1F2937]">R$ 0</span><span className="text-sm text-[#6B7280]">/mês</span></div>
                <p className="text-sm text-[#6B7280] mb-8">Gestão de imóveis grátis para começar a organizar</p>
                <ul className="space-y-3 mb-8">
                  {[['1 imóvel cadastrado',true],['Controle de inquilinos',true],['Histórico de aluguéis',true],['Recibos PDF ilimitados',false],['Alertas automáticos por e-mail',false],['Reajuste automático',false]].map(([f,ok]) => (
                    <li key={f as string} className={`flex items-center gap-2.5 text-sm ${ok ? 'text-[#374151]' : 'text-[#9CA3AF]'}`}>
                      {ok
                        ? <div className="w-4 h-4 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                        : <div className="w-4 h-4 rounded-full bg-[#F1F5F9] flex items-center justify-center shrink-0" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></div>
                      }
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro" className="block text-center border-2 border-[#10B981] text-[#059669] font-semibold py-3 rounded-xl hover:bg-[#F0FDF4] transition-colors text-sm">Criar conta de gestão gratuita</Link>
              </div>
              {/* Pro */}
              <div className="lp-fade lp-delay-1 lp-card bg-white rounded-2xl border-2 border-[#10B981] p-10 relative shadow-[0_8px_32px_rgba(16,185,129,0.18)]">
                <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 bg-[#059669] text-white text-xs font-bold px-4 py-1 rounded-full">Mais popular</div>
                <p className="text-xs font-semibold text-[#059669] uppercase tracking-widest mb-2">Pro</p>
                <div className="flex items-baseline gap-1 mb-1"><span className="text-[42px] font-bold text-[#059669]">R$ 29</span><span className="text-[26px] font-bold text-[#059669]">,90</span><span className="text-sm text-[#6B7280]">/mês</span></div>
                <p className="text-sm text-[#6B7280] mb-8">Gestão completa de imóveis para proprietários</p>
                <ul className="space-y-3 mb-8">
                  {['Até 5 imóveis cadastrados','Controle de inquilinos','Histórico de aluguéis','Recibos PDF ilimitados','Alertas automáticos por e-mail','Reajuste automático IGPM/IPCA'].map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-[#374151]">
                      <div className="w-4 h-4 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0" aria-hidden="true"><svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg></div>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/cadastro" className="block text-center bg-[#059669] hover:bg-[#047857] text-white font-semibold py-3 rounded-xl transition-colors text-sm">Assinar Pro — R$ 29,90/mês</Link>
              </div>
            </div>
            <p className="text-center mt-8 text-sm text-[#9CA3AF] lp-fade">
              ✓ Cancele quando quiser &nbsp;·&nbsp; ✓ Sem taxa de adesão &nbsp;·&nbsp; ✓ Pagamento seguro via Stripe
            </p>
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section aria-labelledby="cta-title" className="relative overflow-hidden py-28 text-center" style={{background:'linear-gradient(135deg,#065F46 0%,#022C22 100%)'}}>
          <div className="lp-blob-1 absolute w-80 h-80 rounded-full -top-20 -left-20 pointer-events-none" style={{background:'rgba(52,211,153,0.1)',filter:'blur(72px)'}} aria-hidden="true" />
          <div className="lp-blob-2 absolute w-64 h-64 rounded-full -bottom-16 -right-16 pointer-events-none" style={{background:'rgba(16,185,129,0.09)',filter:'blur(64px)'}} aria-hidden="true" />
          <div className="max-w-6xl mx-auto px-6 relative z-10 lp-fade">
            <h2 id="cta-title" className="text-[48px] lg:text-[56px] font-bold text-white leading-[1.12] mb-4">
              Pare de improvisar.<br /><span className="text-[#34D399]">Comece a controlar.</span>
            </h2>
            <p className="text-lg mb-10" style={{color:'rgba(255,255,255,0.55)'}}>Gestão de imóveis grátis por 14 dias. Sem cartão de crédito.</p>
            <Link href="/cadastro" className="inline-flex items-center gap-2.5 bg-white hover:bg-[#F0FDF4] text-[#065F46] font-bold px-10 py-4 rounded-xl text-[16px] transition-all hover:-translate-y-1 hover:shadow-2xl">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              Criar conta gratuita agora
            </Link>
          </div>
        </section>

      </main>{/* /#main-content */}

      {/* ── FOOTER ── */}
      <footer role="contentinfo" className="bg-[#111827] pt-16 pb-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-12">
            <div>
              <LogoWhite iconSize={36} className="mb-3" />
              <p className="text-sm leading-relaxed max-w-[260px]" style={{color:'rgba(255,255,255,0.4)'}}>
                Software para proprietário de imóvel — gestão de imóveis simples e eficiente para proprietários brasileiros.
              </p>
            </div>
            {[
              ['Produto', [['#funcionalidades','Funcionalidades'],['#como-funciona','Como funciona'],['#precos','Preços'],['/cadastro','Criar conta']]],
              ['Suporte', [['#','Central de ajuda'],['#','Fale conosco'],['#','Status do sistema']]],
              ['Legal', [['#','Termos de uso'],['#','Privacidade'],['#','LGPD']]],
            ].map(([col, links]) => (
              <div key={col as string}>
                <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{color:'rgba(255,255,255,0.4)'}}>{col}</p>
                <ul className="space-y-2.5">
                  {(links as [string,string][]).map(([href,label]) => (
                    <li key={label}><a href={href} className="text-sm transition-colors hover:text-[#10B981]" style={{color:'rgba(255,255,255,0.55)'}}>{label}</a></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4" style={{borderColor:'rgba(255,255,255,0.08)'}}>
            <p className="text-xs" style={{color:'rgba(255,255,255,0.3)'}}>© 2025 ProprietárioZen. Todos os direitos reservados.</p>
            <div className="flex gap-3">
              {[
                ['Instagram', <svg key="ig" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>],
                ['LinkedIn', <svg key="li" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>],
                ['YouTube', <svg key="yt" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.95C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02"/></svg>],
              ].map(([label, icon]) => (
                <a key={label as string} href="#" aria-label={`ProprietárioZen no ${label}`} className="w-9 h-9 rounded-lg flex items-center justify-center transition-all hover:bg-[#059669]" style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.45)'}}>
                  {icon}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
