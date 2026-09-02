import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { domainAuthStorage } from './domainAuthStorage';

const SUPABASE_URL = 
  import.meta.env.VITE_SUPABASE_URL || 
  'https://tipfbleltjexofsjffwb.supabase.co';

const SUPABASE_PUBLISHABLE_KEY = 
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
  import.meta.env.VITE_SUPABASE_ANON_KEY || 
  'sb_publishable_oxT-cBeoofKTcaUhDBhghQ_Ne-swHDi';

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: domainAuthStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
