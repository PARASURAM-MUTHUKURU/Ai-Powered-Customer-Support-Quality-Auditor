import { createClient, SupabaseClient } from '@supabase/supabase-js';

export let supabase: SupabaseClient | null = null;

export const initSupabase = (url: string, key: string) => {
  if (supabase) return supabase; // Prevent multiple instances

  if (!url || !key) {
    console.error("Missing Supabase URL or Key for initialization");
    return null;
  }
  supabase = createClient(url, key);
  return supabase;
};

export const getSupabase = (): SupabaseClient => {
  if (!supabase) {
    throw new Error("Supabase client not initialized. Call initSupabase first.");
  }
  return supabase;
};
