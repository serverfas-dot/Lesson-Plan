import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const hasRequiredEnvVars = !!(supabaseUrl && supabaseAnonKey);

if (!hasRequiredEnvVars) {
  console.error('Missing Supabase environment variables!');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Present' : 'MISSING');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Present' : 'MISSING');
  console.error('Please add these environment variables in Netlify dashboard');
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
);
