/**
 * Helper para registrar eventos no activity_logs.
 * Uso exclusivo em server-side — nunca em 'use client'.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function registrarLog(
  userId: string,
  action: string,
  entityType?: string,
  entityId?: string,
  metadata?: object,
): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table = supabaseAdmin.from('activity_logs' as never) as any
    await table.insert({
      user_id:     userId,
      action,
      entity_type: entityType ?? null,
      entity_id:   entityId   ?? null,
      details:     metadata   ?? null,
    })
  } catch {
    // tabela pode ainda não existir em ambientes antigos
  }
}
