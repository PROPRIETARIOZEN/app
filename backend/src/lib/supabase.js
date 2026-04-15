'use strict'

require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase não configurado. ' +
    'Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.',
  )
}

/**
 * Cliente Supabase com service role — ignora RLS.
 * Usar apenas no backend. NUNCA expor ao frontend.
 */
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
})

module.exports = supabase
