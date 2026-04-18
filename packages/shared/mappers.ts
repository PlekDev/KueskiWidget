import type { MerchantRow, PromotionRow, BlacklistRow, KueskiUserRow } from './db.types';
import type { Merchant, Promotion, BlacklistedDomain, KueskiUser, DiscountType } from './models';

// ─── Helpers internos ────────────────────────────────────────────────────────

const toDate = (raw: string | null): Date | null =>
  raw ? new Date(raw) : null;

const toDateStrict = (raw: string): Date => new Date(raw);

const toDiscountType = (raw: string): DiscountType => {
  if (raw === 'percentage' || raw === 'shipping' || raw === 'fixed') return raw;
  return 'fixed';
};

// ─── Merchant ────────────────────────────────────────────────────────────────

export const MerchantMapper = {
  toDomain(row: MerchantRow): Merchant {
    return {
      id:              row.uid,
      name:            row.name,
      category:        row.category ?? '',
      domain:          row.domain,
      isActive:        row.is_active,
      cashbackPercent: row.cashback_percent ?? 0,
      logoUrl:         row.logo_url ?? '',
      createdAt:       toDateStrict(row.created_at),
      updatedAt:       toDateStrict(row.updated_at),
    };
  },

  toRow(model: Partial<Merchant>): Partial<MerchantRow> {
    const row: Partial<MerchantRow> = {};
    if (model.name            !== undefined) row.name             = model.name;
    if (model.category        !== undefined) row.category         = model.category;
    if (model.domain          !== undefined) row.domain           = model.domain;
    if (model.isActive        !== undefined) row.is_active        = model.isActive;
    if (model.cashbackPercent !== undefined) row.cashback_percent = model.cashbackPercent;
    if (model.logoUrl         !== undefined) row.logo_url         = model.logoUrl;
    return row;
  },
};

// ─── Promotion ───────────────────────────────────────────────────────────────

export const PromotionMapper = {
  toDomain(row: PromotionRow): Promotion {
    return {
      id:            row.uid,
      merchantId:    row.merchant_id,
      code:          row.code ?? '',
      description:   row.description ?? '',
      discountType:  toDiscountType(row.discount_type),
      discountValue: row.discount_value ?? 0,
      expiresAt:     toDate(row.expires_at),
      isVerified:    row.is_verified ?? false,
      createdAt:     toDateStrict(row.created_at),
      updatedAt:     toDateStrict(row.updated_at),
    };
  },

  toRow(model: Partial<Promotion>): Partial<PromotionRow> {
    const row: Partial<PromotionRow> = {};
    if (model.merchantId    !== undefined) row.merchant_id    = model.merchantId;
    if (model.code          !== undefined) row.code           = model.code;
    if (model.description   !== undefined) row.description    = model.description;
    if (model.discountType  !== undefined) row.discount_type  = model.discountType;
    if (model.discountValue !== undefined) row.discount_value = model.discountValue;
    if (model.expiresAt     !== undefined) row.expires_at     = model.expiresAt?.toISOString() ?? null;
    if (model.isVerified    !== undefined) row.is_verified    = model.isVerified;
    return row;
  },
};

// ─── Blacklist ───────────────────────────────────────────────────────────────

export const BlacklistMapper = {
  toDomain(row: BlacklistRow): BlacklistedDomain {
    return {
      id:        row.uid,
      domain:    row.domain,
      reason:    row.reason ?? '',
      createdAt: toDateStrict(row.created_at),
    };
  },

  toRow(model: Partial<BlacklistedDomain>): Partial<BlacklistRow> {
    const row: Partial<BlacklistRow> = {};
    if (model.domain !== undefined) row.domain = model.domain;
    if (model.reason !== undefined) row.reason = model.reason;
    return row;
  },
};

// ─── KueskiUser ──────────────────────────────────────────────────────────────

export const KueskiUserMapper = {
  toDomain(row: KueskiUserRow): KueskiUser {
    return {
      id:              row.uid,
      email:           row.email,
      firstName:       row.first_name,
      lastName:        row.last_name,
      fullName:        `${row.first_name} ${row.last_name}`,
      creditLimit:     row.credit_limit,
      creditUsed:      row.credit_used,
      creditAvailable: row.credit_limit - row.credit_used,
      maxInstallments: row.max_installments,
      isActive:        row.is_active,
      createdAt:       toDateStrict(row.created_at),
      updatedAt:       toDateStrict(row.updated_at),
    };
  },

  toRow(model: Partial<KueskiUser>): Partial<KueskiUserRow> {
    const row: Partial<KueskiUserRow> = {};
    if (model.email           !== undefined) row.email            = model.email;
    if (model.firstName       !== undefined) row.first_name       = model.firstName;
    if (model.lastName        !== undefined) row.last_name        = model.lastName;
    if (model.creditLimit     !== undefined) row.credit_limit     = model.creditLimit;
    if (model.creditUsed      !== undefined) row.credit_used      = model.creditUsed;
    if (model.maxInstallments !== undefined) row.max_installments = model.maxInstallments;
    if (model.isActive        !== undefined) row.is_active        = model.isActive;
    // fullName y creditAvailable son derivados, no van a DB
    return row;
  },
};