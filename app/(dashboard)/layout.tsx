import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Sidebar } from '@/components/dashboard/sidebar'
import { MobileNav } from '@/components/dashboard/mobile-nav'
import type { Profile } from '@/types'
import { LogoColor } from '@/components/ui/logo'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar desktop — fixa */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border">
        <Sidebar profile={profile as Profile | null} />
      </aside>

      {/* Área principal */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header mobile */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 border-b bg-background">
          <MobileNav profile={profile as Profile | null} />
          <LogoColor iconSize={28} href="/dashboard" />
        </header>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
