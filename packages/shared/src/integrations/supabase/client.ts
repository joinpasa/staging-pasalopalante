import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { domainAuthStorage } from './domainAuthStorage';

const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://tipfbleltjexofsjffwb.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcGZibGVsdGpleG9mc2pmZndiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc1ODk3ODAsImV4cCI6MjEwMzE2NTc4MH0.tWyXhh5CS85RMvYuRFVPem4Oc-q5CBXcACHvlVYvtY8';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: domainAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
