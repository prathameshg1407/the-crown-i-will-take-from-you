// scripts/extend-all-sessions.ts
import { supabaseAdmin } from '@/lib/supabase/server'

async function extendAllSessions() {
  const newExpiry = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // 100 years
  
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .update({ expires_at: newExpiry.toISOString() })
    .lt('expires_at', newExpiry.toISOString()) // Only extend sessions that need it
    .select('id, user_id')
  
  console.log(`Extended ${data?.length || 0} sessions`)
  
  return data
}

extendAllSessions()