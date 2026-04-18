import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Si esto aparece en consola, el .env no está siendo leído por Vite
if (!url || !key) {
  console.error('[Supabase] Variables de entorno no encontradas. Revisa el .env en la raíz y wxt.config.ts');
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});