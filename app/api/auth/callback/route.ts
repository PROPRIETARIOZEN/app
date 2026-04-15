import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { registrarLog } from '@/lib/log'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    if (data.user) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null
      await registrarLog(data.user.id, 'LOGIN', undefined, undefined, ip ? { ip } : undefined)
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`)
}
