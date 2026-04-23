import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { loadEnv } from 'vite';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    // 1. NUEVA CORRECCIÓN: Permiso para que funcione browser.storage.local
    permissions: ['storage'],
    
    // Necesario para que el content script pueda llamar a la REST API de Supabase
    // desde páginas cross-origin (p.ej. liverpool.com.mx).
    host_permissions: ['https://*.supabase.co/*'],
  },
  vite: ({ mode }) => {
    // Carga el .env desde la raíz del monorepo (2 niveles arriba de packages/extension)
    const env = loadEnv(mode, path.resolve(__dirname, '../../'), 'VITE_');

    return {
      plugins: [tailwindcss()],
      resolve: {
        alias: {
          shared: path.resolve(__dirname, '../shared'),
        },
        // 2. CORRECCIÓN PREVIA: Evita el error "Invalid hook call" de React y Lucide
        dedupe: ['react', 'react-dom'], 
      },
      define: {
        'import.meta.env.VITE_SUPABASE_URL':
          JSON.stringify(env.VITE_SUPABASE_URL),
        'import.meta.env.VITE_SUPABASE_ANON_KEY':
          JSON.stringify(env.VITE_SUPABASE_ANON_KEY),
      },
    };
  },
});