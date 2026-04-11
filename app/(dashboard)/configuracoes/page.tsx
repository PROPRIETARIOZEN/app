import { createServerSupabaseClient } from '@/lib/supabase-server'
import { Settings } from 'lucide-react'

export default async function ConfiguracoesPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground text-sm mt-0.5">Gerencie sua conta e preferências</p>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground gap-3">
        <Settings className="h-10 w-10 opacity-30" />
        <p className="text-sm">Em breve</p>
      </div>
    </div>
  )
}
