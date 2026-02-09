import { createClient } from '@supabase/supabase-js'

// Admin client with service role key — server-side only
// Used for operations that require elevated privileges (e.g., creating auth users)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
