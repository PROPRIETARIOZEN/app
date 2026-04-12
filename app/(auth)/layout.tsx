import { LogoWhite, LogoColor } from '@/components/ui/logo'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel — branding */}
      <div
        className="hidden lg:flex flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #065F46 0%, #022C22 100%)' }}
      >
        <div className="auth-blob-1" />
        <div className="auth-blob-2" />

        {/* Logo */}
        <div className="relative z-10">
          <LogoWhite iconSize={36} />
        </div>

        {/* Main content */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Gerencie seus imóveis com tranquilidade
            </h1>
            <p className="text-emerald-200 text-lg leading-relaxed">
              Controle aluguéis, inquilinos e recibos em um só lugar. Simples, rápido e eficiente.
            </p>
          </div>

          {/* Feature bullets */}
          <ul className="space-y-3">
            {[
              'Recibos em PDF com um clique',
              'Cobranças automáticas por WhatsApp',
              'Reajuste automático por IGPM/IPCA',
            ].map((item) => (
              <li key={item} className="flex items-center gap-3 text-white/90 text-sm">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/25 flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1.5" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>

          {/* Mini dashboard mockup */}
          <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/50 font-medium">Painel geral</span>
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                Ao vivo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Imóveis', value: '12' },
                { label: 'Inquilinos', value: '10' },
                { label: 'Recebido', value: 'R$ 14k' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl bg-white/5 p-2.5 text-center">
                  <p className="text-[11px] text-white/40">{stat.label}</p>
                  <p className="text-sm font-bold text-white mt-0.5">{stat.value}</p>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {[
                { name: 'Ap. 201 — Centro', tag: 'Pago', emerald: true },
                { name: 'Casa 4B — Jardins', tag: 'Vence hoje', emerald: false },
              ].map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-1.5">
                  <span className="text-xs text-white/70">{item.name}</span>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      item.emerald
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.tag}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-xs text-white/30">© 2025 ProprietárioZen. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center p-8 bg-white min-h-screen">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <LogoColor iconSize={32} href="/" />
          </div>

          {children}
        </div>
      </div>
    </div>
  )
}
