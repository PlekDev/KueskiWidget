// ─── Raw DB row types ────────────────────────────────────────────────────────
// Reflejan exactamente las columnas de Supabase (snake_case).
// NO los uses directamente en la lógica de negocio — usa los modelos mapeados.

export interface MerchantRow {
  uid: string;
  name: string;
  category: string | null;
  domain: string;
  is_active: boolean;
  cashback_percent: number | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PromotionRow {
  uid: string;
  merchant_id: string;
  code: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number | null;
  expires_at: string | null;
  is_verified: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface BlacklistRow {
  uid: string;
  domain: string;
  reason: string | null;
  created_at: string;
}

export interface KueskiUserRow {
  uid: string;
  email: string;
  first_name: string;
  last_name: string;
  credit_limit: number;
  credit_used: number;
  max_installments: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}