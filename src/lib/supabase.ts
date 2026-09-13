import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

// Server-only administrative Supabase client using the Service Role Key.
// CAUTION: This client bypasses Row Level Security and MUST NEVER be exposed to browser/client bundles.
let serverClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (typeof window !== 'undefined') {
    throw new Error('[SECURITY FATAL] Server Supabase client cannot be instantiated in client-side code.');
  }

  if (serverClient) return serverClient;

  if (config.supabaseUrl && config.supabaseServiceRoleKey) {
    serverClient = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return serverClient;
  }

  return null;
}