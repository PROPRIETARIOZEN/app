import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const rotasPublicas = [
  '/',
  '/login',
  '/cadastro',
  '/recuperar-senha',
  '/sucesso',
  '/cancelado',
  '/planos',
  '/bloqueado',
  '/api/auth',
  '/inquilino',
  '/api/inquilino/pagina',
  '/api/inquilino/documento',
]

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname
  const isPublica = rotasPublicas.some(r => pathname.startsWith(r))

  // ── Bloqueio de usuários banidos ─────────────────────────────────────────
  if (user && pathname !== '/bloqueado' && !pathname.startsWith('/api/') && !pathname.startsWith('/admin')) {
    const { data: profileBan } = await supabase
      .from('profiles')
      .select('banned')
      .eq('id', user.id)
      .maybeSingle()

    if (profileBan?.banned === true) {
      const url = request.nextUrl.clone()
      url.pathname = '/bloqueado'
      return NextResponse.redirect(url)
    }
  }

  // ── Proteção /admin/* ─────────────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Não autenticado → login
    if (!user) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Verificar role = 'admin' no banco (RLS permite ler o próprio perfil)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role !== 'admin') {
      // Autenticado mas não é admin → redireciona para /dashboard com flag
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      url.searchParams.set('acesso', 'negado')
      return NextResponse.redirect(url)
    }

    return supabaseResponse
  }

  // ── Proteção geral ────────────────────────────────────────────────────────

  // Redireciona para /login se não autenticado e não está em rota pública
  if (!user && !isPublica) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redireciona para /dashboard se autenticado e tenta acessar rota pública de auth
  if (user && (pathname === '/login' || pathname === '/cadastro' || pathname === '/recuperar-senha')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Usuário autenticado em / → dashboard
  if (pathname === '/' && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
