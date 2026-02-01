// src/lib/site/config.ts

import { supabaseAdmin } from '@/lib/supabase/server'

export const SITE_KEY = process.env.NEXT_PUBLIC_SITE_KEY!

if (!SITE_KEY) {
  throw new Error('NEXT_PUBLIC_SITE_KEY environment variable is required')
}

// Cache site_id to avoid repeated DB calls
let cachedSiteId: number | null = null

export async function getSiteId(): Promise<number> {
  if (cachedSiteId) return cachedSiteId

  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('id')
    .eq('site_key', SITE_KEY)
    .single()

  if (error || !data) {
    throw new Error(`Site not found for key: ${SITE_KEY}`)
  }

  cachedSiteId = data.id
  return data.id
}

export async function getSiteInfo() {
  const { data, error } = await supabaseAdmin
    .from('sites')
    .select('*')
    .eq('site_key', SITE_KEY)
    .single()

  if (error || !data) {
    throw new Error(`Site not found for key: ${SITE_KEY}`)
  }

  return data
}