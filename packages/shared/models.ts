// ─── Domain models ───────────────────────────────────────────────────────────
// Modelos que usa la lógica de negocio: camelCase, tipos fuertes, sin ruido de DB.

export type DiscountType = 'percentage' | 'shipping' | 'fixed';

export interface Merchant {
  id: string;
  name: string;
  category: string;
  domain: string;
  isActive: boolean;
  cashbackPercent: number;
  logoUrl: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Promotion {
  id: string;
  merchantId: string;
  code: string;
  description: string;
  discountType: DiscountType;
  discountValue: number;
  expiresAt: Date | null;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BlacklistedDomain {
  id: string;
  domain: string;
  reason: string;
  createdAt: Date;
}

export interface KueskiUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;          // campo derivado: firstName + lastName
  creditLimit: number;
  creditUsed: number;
  creditAvailable: number;  // campo derivado: limit - used
  maxInstallments: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}