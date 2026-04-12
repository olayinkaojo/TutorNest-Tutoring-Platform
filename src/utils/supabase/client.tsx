import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey, authDomain } from './info';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const supabaseUrl = authDomain
      ? `https://${authDomain}`
      : `https://${projectId}.supabase.co`;

    supabaseClient = createClient(
      supabaseUrl,
      publicAnonKey
    );
  }
  return supabaseClient;
}
