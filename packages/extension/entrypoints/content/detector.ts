import { supabase } from 'shared/supabase';
import { MerchantMapper } from 'shared/mappers';
import type { Merchant } from 'shared/models';

const ALLOWED_TLDS = ['.com', '.mx'];

export const hasAllowedTld = (host: string): boolean =>
  ALLOWED_TLDS.some(tld => host.endsWith(tld));

export const isBlacklisted = async (hostname: string): Promise<boolean> => {
  const { data } = await supabase.from('blacklist').select('domain');
  if (!data) return false;
  const host = hostname.toLowerCase();
  return data.some(b => {
    const d = b.domain.toLowerCase();
    return host === d || host.endsWith('.' + d);
  });
};

export const getActiveMerchant = async (hostname: string): Promise<Merchant | null> => {
  const { data, error } = await supabase
    .from('merchants')
    .select('*')
    .eq('is_active', true);

  if (error || !data) return null;

  const host = hostname.toLowerCase();
  const row = data.find(m => {
    const d = m.domain.toLowerCase();
    return host === d || host.endsWith('.' + d);
  });
  return row ? MerchantMapper.toDomain(row) : null;
};

// Dominios con convenio oficial de Kueski Pay (independiente de Supabase).
// Usados para mostrar la notificación "Esta tienda acepta Kueski Pay".
const KUESKI_PAY_PARTNERS = [
  'amazon.com.mx',
  'mercadolibre.com.mx',
  'walmart.com.mx',
  'palacio.com.mx',
  'costco.com.mx',
];

export const isKueskiPayPartner = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  return KUESKI_PAY_PARTNERS.some(d => host === d || host.endsWith('.' + d));
};
