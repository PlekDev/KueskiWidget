import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// En packages/server/src/test-db.ts
import { KueskiUserMapper, MerchantMapper } from '../../shared/mappers.ts'; // Sin .js
// Importación limpia sin .js (la bandera de resolución se encarga)

// Carga el .env desde la raíz
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function runTest() {
  console.log('🚀 Iniciando prueba...');
  const { data, error } = await supabase.from('kueski_users').select('*').limit(1).single();

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  const user = KueskiUserMapper.toDomain(data);
  console.log('✅ Usuario:', user.fullName); // Valida campo derivado
  console.log('✅ Crédito:', user.creditAvailable); // Valida campo derivado
}

runTest();