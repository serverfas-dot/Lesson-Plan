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

const fetchWithTimeout: typeof fetch = async (input, init) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  const requestSignal = init?.signal;
  const abortRequest = () => controller.abort();

  if (requestSignal) {
    if (requestSignal.aborted) controller.abort();
    else requestSignal.addEventListener('abort', abortRequest, { once: true });
  }

  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    requestSignal?.removeEventListener('abort', abortRequest);
  }
};

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  { global: { fetch: fetchWithTimeout } }
);
