'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Building2, Users, Receipt,
  Settings, LogOut, Star, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase'
import type { Profile } from '@/types'
import { LogoWhite } from '@/components/ui/logo'

const navItems = [
  { href: '/dashboard',     label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/imoveis',       label: 'Imóveis',      icon: Building2 },
  { href: '/inquilinos',    label: 'Inquilinos',   icon: Users },
  { href: '/alugueis',      label: 'Aluguéis',     icon: Receipt },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
]

interface SidebarProps {
  profile: Profile | null
  onClose?: () => void
}

export function Sidebar({ profile, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isPro = profile?.plano === 'pago'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/login')
    router.refresh()
  }

  const initials = profile?.nome
    ? profile.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'PZ'

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="px-5 py-5">
        <LogoWhite iconSize={36} />
      </div>

      <div className="h-px bg-sidebar-border mx-3" />

      {/* Navegação */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const ativo = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={cn(
                'relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                ativo
                  ? 'bg-sidebar-accent text-white'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-[#E2E8F0]',
              )}
            >
              {ativo && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-sidebar-primary" />
              )}
              <Icon className={cn('h-4 w-4 shrink-0', ativo ? 'text-sidebar-primary' : 'text-[#64748B]')} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Card upgrade — plano Grátis */}
      {!isPro && (
        <div className="px-3 pb-3">
          <div className="rounded-xl border border-sidebar-primary/20 bg-sidebar-accent/50 p-3 space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-sidebar-primary/20 flex items-center justify-center">
                <Star className="h-3.5 w-3.5 text-sidebar-primary" />
              </div>
              <span className="text-xs font-semibold text-[#E2E8F0]">Plano Grátis</span>
            </div>
            <p className="text-[11px] text-sidebar-foreground leading-relaxed">
              Desbloqueie até 5 imóveis, recibos PDF e alertas automáticos.
            </p>
            <Link
              href="/planos"
              onClick={onClose}
              className="flex items-center justify-between w-full rounded-lg bg-sidebar-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#047857] transition-colors"
            >
              Fazer upgrade Pro
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}

      <div className="h-px bg-sidebar-border mx-3" />

      {/* Usuário */}
      <div className="px-3 py-4 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-white truncate">{profile?.nome ?? 'Usuário'}</p>
              {isPro && (
                <Badge className="bg-[#D1FAE5] text-[#065F46] hover:bg-[#D1FAE5] text-[10px] h-4 px-1.5 shrink-0 font-semibold">
                  Pro
                </Badge>
              )}
            </div>
            <p className="text-xs text-sidebar-foreground/70 truncate">{profile?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="w-full justify-start gap-3 px-3 text-sidebar-foreground hover:text-white hover:bg-sidebar-accent/60"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  )
}
