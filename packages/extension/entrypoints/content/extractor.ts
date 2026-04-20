import type { Merchant } from 'shared/models';
import type { ExtractedData, PriceExtractor } from './types';

// Selectores universales de precio oferta/descuento.
// [... i] = atributo-contiene case-insensitive, cacha variaciones de naming.
const GENERIC_DISCOUNT_SELECTORS = [
  '[class*="descPrecio" i]',
  '[class*="desc-precio" i]',
  '[class*="precio-descuento" i]',
  '[class*="precio-oferta" i]',
  '[class*="discount-price" i]',
  '[class*="price-discount" i]',
  '[class*="sale-price" i]',
  '[class*="price-sale" i]',
  '[class*="offer-price" i]',
  '[class*="price-offer" i]',
  '[class*="cont-price-discount" i]',
  '[id*="descPrecio" i]',
  '[id*="priceDiscount" i]',
  '[id*="salePrice" i]',
  '[id*="offerPrice" i]',
];

// Llave = merchant.domain (lowercase). Debe matchear exacto la columna `domain`.
const EXTRACTORS: Record<string, PriceExtractor> = {
  'liverpool.com.mx': {
    priceSelectors: ['.price-main', '[class*="price"]', '.product-price'],
    titleSelectors: ['h1', '.product-title', '[class*="title"]'],
    fallbackTitle: 'Producto Liverpool',
  },
  'elektra.com.mx': {
    priceSelectors: ['.price', '[class*="price"]', '.product-price'],
    titleSelectors: ['h1', '.product-name'],
    fallbackTitle: 'Producto Elektra',
  },
  'officedepot.com.mx': {
    priceSelectors: ['.price', '[class*="price"]', '[itemprop="price"]'],
    titleSelectors: ['h1', '.product-name', '[itemprop="name"]'],
    fallbackTitle: 'Producto Office Depot',
  },
  'mx.puma.com': {
    priceSelectors: ['.price', '[class*="price"]'],
    titleSelectors: ['h1', '.product-name', '[class*="title"]'],
    fallbackTitle: 'Producto PUMA',
  },
};

const queryText = (selectors: string[]): string | null => {
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el?.textContent?.trim()) return el.textContent.trim();
  }
  return null;
};

const queryAllTexts = (selectors: string[]): string[] => {
  const out: string[] = [];
  for (const sel of selectors) {
    try {
      document.querySelectorAll(sel).forEach(el => {
        const t = el.textContent?.trim();
        if (t) out.push(t);
      });
    } catch {
      // selector invalido, ignora
    }
  }
  return out;
};

// "$13,299.00 $11,999.00 MXN" → [13299, 11999]
const parseAllPrices = (t: string): number[] => {
  const out: number[] = [];
  const matches = t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d+/g);
  for (const m of matches) {
    const n = parseFloat(m[0].replace(/,/g, ''));
    if (isFinite(n) && n > 0) out.push(n);
  }
  return out;
};

// Capa 1: JSON-LD (schema.org Product) — colecta TODOS los precios del Product.
const fromJsonLd = (): { prices: number[]; name: string } => {
  const prices: number[] = [];
  let name = '';

  const toNumber = (raw: unknown): number | null => {
    if (raw == null) return null;
    const n = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    return isFinite(n) && n > 0 ? n : null;
  };

  // Recorre offer/AggregateOffer/priceSpecification en cualquier profundidad.
  const walkOffer = (o: unknown): void => {
    if (!o) return;
    if (Array.isArray(o)) { o.forEach(walkOffer); return; }
    if (typeof o !== 'object') return;
    const obj = o as Record<string, unknown>;
    for (const key of ['price', 'lowPrice', 'highPrice']) {
      const n = toNumber(obj[key]);
      if (n !== null) prices.push(n);
    }
    walkOffer(obj.offers);
    walkOffer(obj.priceSpecification);
  };

  const scripts = document.querySelectorAll<HTMLScriptElement>(
    'script[type="application/ld+json"]',
  );
  for (const s of scripts) {
    try {
      const raw = s.textContent;
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        const nodes = root['@graph'] ?? [root];
        for (const node of nodes) {
          if (node?.['@type'] !== 'Product') continue;
          if (!name && node.name) name = String(node.name);
          walkOffer(node.offers);
        }
      }
    } catch {
      // JSON invalido, seguir
    }
  }
  return { prices, name };
};

// Capa 2: meta tags / microdata
const fromMeta = (): { price: number; name: string } | null => {
  const metaContent = (selector: string): string | null =>
    document.querySelector<HTMLMetaElement>(selector)?.getAttribute('content') ?? null;

  const raw =
    metaContent('meta[property="product:price:amount"]') ??
    metaContent('meta[property="og:price:amount"]') ??
    metaContent('meta[itemprop="price"]') ??
    document.querySelector('[itemprop="price"]')?.getAttribute('content') ??
    null;
  if (!raw) return null;
  const price = parseFloat(raw);
  if (!(price > 0)) return null;
  const name =
    metaContent('meta[property="og:title"]') ??
    metaContent('meta[name="title"]') ??
    '';
  return { price, name };
};

const isSanePrice = (p: number) => p >= 100 && p < 1_000_000;

export const extractPriceAndProduct = (merchant: Merchant): ExtractedData | null => {
  const extractor = EXTRACTORS[merchant.domain.toLowerCase()];
  const fallbackTitle = extractor?.fallbackTitle ?? `Producto ${merchant.name}`;

  const candidates: number[] = [];
  let name = '';

  // 1. JSON-LD: todos los precios del Product (oferta, lista, aggregate)
  const ld = fromJsonLd();
  candidates.push(...ld.prices);
  if (ld.name) name = ld.name;

  // 2. Meta tags / microdata
  const meta = fromMeta();
  if (meta) {
    candidates.push(meta.price);
    if (!name) name = meta.name;
  }

  // 3. Selectores universales de descuento (siempre, indep. del merchant)
  const discountTexts = queryAllTexts(GENERIC_DISCOUNT_SELECTORS);
  discountTexts.forEach(t => candidates.push(...parseAllPrices(t)));

  // 4. Selectores CSS del merchant — sólo si aún no hay candidatos
  if (candidates.length === 0 && extractor) {
    const priceTexts = queryAllTexts(extractor.priceSelectors);
    priceTexts.forEach(t => candidates.push(...parseAllPrices(t)));
    const title = queryText(extractor.titleSelectors);
    if (!name && title) name = title;
  }

  // Min(sane) = precio de oferta (descarta precio tachado/lista).
  const sane = candidates.filter(isSanePrice);
  if (sane.length === 0) return null;

  return { price: Math.min(...sane), productName: name || fallbackTitle, currency: 'MXN' };
};