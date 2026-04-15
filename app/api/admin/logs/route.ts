import { NextRequest, NextResponse } from 'next/server'
import { verifyAdminRequest } from '@/lib/admin'
import { createAdminSupabaseClient } from '@/lib/supabase-admin'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 50

// GET /api/admin/logs?page=1&user_id=&action=&date_from=&date_to=
export async function GET(req: NextRequest) {
  const auth = await verifyAdminRequest()
  if (auth instanceof NextResponse) return auth

  const { searchParams } = req.nextUrl
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const user_id   = searchParams.get('user_id')   ?? ''
  const action    = searchParams.get('action')    ?? ''
  const date_from = searchParams.get('date_from') ?? ''
  const date_to   = searchParams.get('date_to')   ?? ''

  const admin = createAdminSupabaseClient()
  const agora = new Date()

  // ── Summary cards (computed from TODAY / this month) ───────────────────
  const hojeStr    = agora.toISOString().slice(0, 10)
  const mesInicioStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}-01`

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const logsTable = admin.from('activity_logs' as never) as any

  type ActivityRow = {
    id: string
    user_id: string
    action: string
    entity_type: string | null
    entity_id: string | null
    details: unknown
    ip_address: string | null
    created_at: string
    profiles: { id: string; nome: string; email: string } | null
  }

  let summary = {
    eventos_hoje:       0,
    logins_hoje:        0,
    upgrades_mes:       0,
    cancelamentos_mes:  0,
  }

  let allLogs: ActivityRow[] = []

  try {
    // Buscar logs com JOIN profiles
    let q = logsTable
      .select(`
        id,
        user_id,
        action,
        entity_type,
        entity_id,
        details,
        ip_address,
        created_at,
        profiles!activity_logs_user_id_fkey (
          id,
          nome,
          email
        )
      `)
      .order('created_at', { ascending: false })

    if (user_id) q = q.eq('user_id', user_id)
    if (action)  q = q.eq('action', action)
    if (date_from) q = q.gte('created_at', `${date_from}T00:00:00.000Z`)
    if (date_to)   q = q.lte('created_at', `${date_to}T23:59:59.999Z`)

    const { data: logsData } = await q
    allLogs = (logsData ?? []) as ActivityRow[]

    // Summary: query sem filtros para contagens precisas
    const { data: summaryData } = await logsTable
      .select('action, created_at')
      .order('created_at', { ascending: false })
      .limit(5000)

    type SummaryRow = { action: string; created_at: string }
    const sRows = (summaryData ?? []) as SummaryRow[]

    summary = {
      eventos_hoje:      sRows.filter(r => r.created_at.startsWith(hojeStr)).length,
      logins_hoje:       sRows.filter(r => r.created_at.startsWith(hojeStr) && r.action === 'LOGIN').length,
      upgrades_mes:      sRows.filter(r => r.created_at >= mesInicioStr && r.action === 'UPGRADE_PRO').length,
      cancelamentos_mes: sRows.filter(r => r.created_at >= mesInicioStr && r.action === 'CANCELAMENTO').length,
    }
  } catch {
    // tabela activity_logs ainda não existe
  }

  // ── Enriquecer com profile info ──────────────────────────────────────────
  const enriched = allLogs.map(log => ({
    id:          log.id,
    user_id:     log.user_id,
    action:      log.action,
    entity_type: log.entity_type,
    entity_id:   log.entity_id,
    details:     log.details,
    ip_address:  log.ip_address,
    created_at:  log.created_at,
    user_nome:   (log.profiles as { nome?: string } | null)?.nome  ?? '',
    user_email:  (log.profiles as { email?: string } | null)?.email ?? '',
  }))

  // ── Paginar ────────────────────────────────────────────────────────────────
  const from     = (page - 1) * PAGE_SIZE
  const pageData = enriched.slice(from, from + PAGE_SIZE)

  return NextResponse.json({
    data: pageData,
    summary,
    pagination: {
      page,
      page_size:   PAGE_SIZE,
      total:       enriched.length,
      total_pages: Math.ceil(enriched.length / PAGE_SIZE),
    },
  })
}
