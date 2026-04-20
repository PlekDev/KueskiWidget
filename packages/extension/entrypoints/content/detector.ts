import { supabase } from 'shared/supabase';
import { MerchantMapper } from 'shared/mappers';
import type { Merchant } from 'shared/models';

// Solo sitios .com / .mx (incluye .com.mx). Filtra TLDs sospechosos antes de DB.
const ALLOWED_TLDS = ['.com', '.mx'];

export const hasAllowedTld = (host: string): boolean =>
  ALLOWED_TLDS.some(tld => host.endsWith(tld));

export const isBlacklisted = async (hostname: string): Promise<boolean> => {
  const { data } = await supabase.from('blacklist').select('domain');
  if (!data) return false;
  const host = hostname.toLowerCase();
  // Suffix match: bloquea subdominios aunque DB guarde solo el dominio base.
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
  // Suffix estricto: 'liverpool.com.mx.phish.ru' NO matchea liverpool.com.mx.
  const row = data.find(m => {
    const d = m.domain.toLowerCase();
    return host === d || host.endsWith('.' + d);
  });
  return row ? MerchantMapper.toDomain(row) : null;
};