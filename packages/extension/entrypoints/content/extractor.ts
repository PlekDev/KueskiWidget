import type { CartData, CartItem, ExtractedData, PriceExtractor } from './types';

// Selectores genéricos de precio con descuento/oferta
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
  '[class*="current-price" i]',
  '[class*="final-price" i]',
  '[class*="precio-actual" i]',
  '[class*="precio-final" i]',
  '[class*="precio-especial" i]',
];

// Selectores genéricos de título
const GENERIC_TITLE_SELECTORS = [
  '[itemprop="name"]',
  'h1[class*="product" i]',
  'h1[class*="titulo" i]',
  'h1[class*="title" i]',
  '[class*="product-title" i]',
  '[class*="product-name" i]',
  '[class*="nombre-producto" i]',
  '[id*="product-title" i]',
  '[id*="productTitle" i]',
  'h1',
];

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
  'amazon.com.mx': {
    // Contenedor específico del precio principal — evita precios de sidebars/recomendaciones
    priceSelectors: [
      '#corePriceDisplay_desktop_feature_div .a-price .a-offscreen',
      '#apex_offerDisplay_desktop .a-price .a-offscreen',
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '.a-price .a-offscreen',
    ],
    titleSelectors: ['#productTitle', '#title', 'h1'],
    fallbackTitle: 'Producto Amazon',
  },
  'mercadolibre.com.mx': {
    priceSelectors: [
      '[class*="ui-pdp-price__main-price"] .andes-money-amount__fraction',
      '[class*="price-tag-fraction"]',
      '[class*="andes-money-amount__fraction"]',
    ],
    titleSelectors: ['h1.ui-pdp-title', '[class*="ui-pdp-title"]', 'h1'],
    fallbackTitle: 'Producto MercadoLibre',
  },
  'walmart.com.mx': {
    priceSelectors: [
      '[itemprop="price"]',
      '[class*="price-characteristic" i]',
      '[class*="current-price" i]',
    ],
    titleSelectors: ['h1[itemprop="name"]', 'h1', '[itemprop="name"]'],
    fallbackTitle: 'Producto Walmart',
  },
  'palacio.com.mx': {
    priceSelectors: ['[class*="price"]', '[class*="precio"]'],
    titleSelectors: ['h1', '[class*="product-name" i]'],
    fallbackTitle: 'Producto El Palacio',
  },
  'costco.com.mx': {
    priceSelectors: ['[class*="price"]', '[class*="precio"]', '.your-price'],
    titleSelectors: ['h1', '[class*="product-title" i]'],
    fallbackTitle: 'Producto Costco',
  },
};

const queryText = (selectors: string[]): string | null => {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel);
      const text = el?.getAttribute('content') ?? el?.textContent?.trim();
      if (text) return text;
    } catch { /* selector inválido */ }
  }
  return null;
};

// "$13,299.00" → 13299
const parseAllPrices = (t: string): number[] => {
  const out: number[] = [];
  const matches = t.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+\.\d+|\d+/g);
  for (const m of matches) {
    const n = parseFloat(m[0].replace(/,/g, ''));
    if (isFinite(n) && n > 0) out.push(n);
  }
  return out;
};

const isSanePrice = (p: number) => p >= 100 && p < 1_000_000;

// Capa 1: JSON-LD — obtiene el precio del PRIMER Product encontrado.
//
// IMPORTANTE: ignoramos lowPrice/highPrice de AggregateOffer porque Amazon (y otros)
// usan AggregateOffer.lowPrice para el precio mínimo de vendedores terceros, que puede
// ser muy inferior al precio real que muestra la página.
const fromJsonLd = (): { price: number | null; name: string } => {
  const toNum = (raw: unknown): number | null => {
    if (raw == null) return null;
    const n = typeof raw === 'string' ? parseFloat(raw.replace(/,/g, '')) : Number(raw);
    return isFinite(n) && n > 0 ? n : null;
  };

  // Extrae un precio de un nodo Offer/AggregateOffer.
  // Para AggregateOffer sólo usa `price`, nunca lowPrice/highPrice.
  const offerPrice = (o: unknown): number | null => {
    if (!o || typeof o !== 'object') return null;
    const obj = o as Record<string, unknown>;
    // El campo `price` es el precio actual del vendedor principal.
    const direct = toNum(obj['price']);
    if (direct !== null) return direct;
    // Para Offer (no Aggregate) podemos usar lowPrice como alternativa.
    if (obj['@type'] !== 'AggregateOffer') {
      return toNum(obj['lowPrice']);
    }
    return null;
  };

  // Colecta precios de un nodo offers (puede ser array).
  const collectOffers = (offers: unknown): number[] => {
    if (Array.isArray(offers)) {
      return offers.map(offerPrice).filter((p): p is number => p !== null);
    }
    const p = offerPrice(offers);
    return p !== null ? [p] : [];
  };

  const scripts = document.querySelectorAll<HTMLScriptElement>('script[type="application/ld+json"]');
  for (const s of scripts) {
    try {
      const parsed = JSON.parse(s.textContent ?? '');
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots) {
        const nodes = root['@graph'] ?? [root];
        for (const node of (nodes as unknown[])) {
          if ((node as Record<string, unknown>)?.['@type'] !== 'Product') continue;
          const n = node as Record<string, unknown>;
          const prices = collectOffers(n['offers']).filter(isSanePrice);
          if (prices.length > 0) {
            // Devuelve el precio más bajo de las ofertas REALES (no aggregate lowPrice)
            return { price: Math.min(...prices), name: String(n['name'] ?? '') };
          }
        }
      }
    } catch { /* JSON inválido */ }
  }
  return { price: null, name: '' };
};

// Capa 2: meta tags Open Graph / microdata
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
  const price = parseFloat(raw.replace(/,/g, ''));
  if (!(price > 0)) return null;
  const name =
    metaContent('meta[property="og:title"]') ??
    metaContent('meta[name="title"]') ??
    '';
  return { price, name };
};

const getGenericTitle = (): string => {
  const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content;
  if (og?.trim()) return og.trim().slice(0, 80);
  return document.title.trim().slice(0, 80) || location.hostname.replace(/^www\./, '');
};

const findExtractor = (hostname: string): PriceExtractor | undefined => {
  const host = hostname.toLowerCase();
  const key = Object.keys(EXTRACTORS).find(k => host === k || host.endsWith('.' + k));
  return key ? EXTRACTORS[key] : undefined;
};

// Estrategia: devuelve en cuanto encuentra un precio confiable.
// No acumula todos los precios del DOM; eso causaba falsos positivos
// cuando la página tiene otros productos en sidebars/recomendaciones.
export const extractPriceAndProduct = (): ExtractedData | null => {
  const hostname = location.hostname.toLowerCase();
  const extractor = findExtractor(hostname);

  const title = () =>
    queryText(GENERIC_TITLE_SELECTORS) ?? getGenericTitle();

  // 1. JSON-LD — más fiable: estructura semántica del producto principal
  const ld = fromJsonLd();
  if (ld.price !== null && isSanePrice(ld.price)) {
    return {
      price: ld.price,
      productName: ld.name || title(),
      currency: 'MXN',
    };
  }

  // 2. Meta tags (og:price, product:price) — confiables, un solo valor
  const meta = fromMeta();
  if (meta && isSanePrice(meta.price)) {
    return {
      price: meta.price,
      productName: meta.name || title(),
      currency: 'MXN',
    };
  }

  // 3. Selectores específicos del dominio — primer match solamente
  if (extractor) {
    const priceText = queryText(extractor.priceSelectors);
    if (priceText) {
      const prices = parseAllPrices(priceText).filter(isSanePrice);
      if (prices.length > 0) {
        const name = queryText([...extractor.titleSelectors, ...GENERIC_TITLE_SELECTORS]) ?? title();
        return { price: Math.min(...prices), productName: name, currency: 'MXN' };
      }
    }
  }

  // 4. Selectores genéricos de descuento — primer elemento que tenga precio válido
  for (const sel of GENERIC_DISCOUNT_SELECTORS) {
    try {
      const el = document.querySelector(sel);
      if (!el) continue;
      const prices = parseAllPrices(el.textContent ?? '').filter(isSanePrice);
      if (prices.length > 0) {
        return { price: Math.min(...prices), productName: title(), currency: 'MXN' };
      }
    } catch { /* selector inválido */ }
  }

  return null;
};

// ─── CART DETECTION ──────────────────────────────────────────────────────────

const CART_URL_PATTERNS = ['/cart', '/carrito', '/basket', '/bolsa', '/shopping-bag', '/carro', '/mi-carrito', '/bag', '/checkout'];

export const isCartPage = (): boolean => {
  const url = location.pathname.toLowerCase();
  return CART_URL_PATTERNS.some(p => url.includes(p));
};

interface CartExtractor {
  itemSelector: string;
  nameSelectors: string[];
  priceSelectors: string[];
  quantitySelectors: string[];
  totalSelectors: string[];
}

const MERCHANT_CART_EXTRACTORS: Record<string, CartExtractor> = {
  'amazon.com.mx': {
    itemSelector: '.sc-list-item[data-asin]',
    nameSelectors: ['.sc-product-title span', '[class*="sc-item-content"] a', '.a-size-base-plus'],
    priceSelectors: ['.sc-price', '.a-price .a-offscreen', '[class*="sc-item-price"]'],
    quantitySelectors: ['[data-a-input-name*="quantity"] .a-dropdown-prompt', '.sc-action-quantity input'],
    totalSelectors: ['#sc-subtotal-amount-activecart .a-size-medium', '#sc-subtotal-amount-buybox .a-size-medium', '[class*="sc-subtotal-amount"]'],
  },
  'mercadolibre.com.mx': {
    itemSelector: '[class*="cart-row"], [class*="shopping-cart__item"], [class*="ui-row"]',
    nameSelectors: ['[class*="item-title"]', '[class*="title-link"]', 'a[class*="title"]', 'h2'],
    priceSelectors: ['[class*="price-tag-fraction"]', '[class*="andes-money-amount__fraction"]', '[class*="item-price"]'],
    quantitySelectors: ['[class*="item-qty"] input', '[class*="quantity"] input', 'input[type="number"]'],
    totalSelectors: ['[class*="summary__total"] [class*="price-tag-fraction"]', '[class*="cart-summary__prices"] [class*="andes-money-amount__fraction"]'],
  },
  'walmart.com.mx': {
    itemSelector: '[data-testid="cart-line-item"], [class*="Cart-item"], [class*="cart-item"]',
    nameSelectors: ['[class*="ItemTitle"]', '[class*="item-title"]', '[class*="product-title"]', 'a[class*="name"]'],
    priceSelectors: ['[class*="ItemPrice"]', '[class*="item-price"]', '[itemprop="price"]'],
    quantitySelectors: ['[class*="ItemQuantity"] input', '[data-testid*="quantity"] input', 'input[type="number"]'],
    totalSelectors: ['[class*="cart-summary-item-total"]', '[data-testid="cart-summary-total"]', '[class*="order-summary-total"]'],
  },
  'liverpool.com.mx': {
    itemSelector: '[class*="cart-item"], [class*="CartItem"], [class*="minicart-product"]',
    nameSelectors: ['[class*="product-name"]', '[class*="item-name"]', 'a[class*="name"]', 'span[class*="name"]'],
    priceSelectors: ['[class*="prices-price"]', '[class*="item-price"]', '[class*="product-price"]'],
    quantitySelectors: ['[class*="quantity-value"]', '[class*="item-qty"]', 'input[type="number"]'],
    totalSelectors: ['[class*="cart-totals-total"]', '[class*="order-total"]', '[class*="totals-total"]'],
  },
};

const CART_TOTAL_SELECTORS = [
  '[class*="cart-total" i]',
  '[class*="order-total" i]',
  '[class*="total-price" i]',
  '[class*="grand-total" i]',
  '[class*="subtotal" i]',
  '[id*="cart-total" i]',
  '[id*="orderTotal" i]',
  '[class*="resumen-total" i]',
  '[class*="total-order" i]',
  '[data-testid*="total" i]',
];

const CART_ITEM_SELECTORS = [
  '[class*="cart-item" i]',
  '[class*="bag-item" i]',
  '[class*="basket-item" i]',
  '[class*="cart-product" i]',
  '[class*="item-row" i]',
  'tr[class*="item" i]',
  '[class*="producto-carrito" i]',
  '[class*="line-item" i]',
];

const queryTextIn = (root: Element, selectors: string[]): string | null => {
  for (const sel of selectors) {
    try {
      const node = root.querySelector(sel);
      const text = node?.getAttribute('content') ?? node?.textContent?.trim();
      if (text) return text;
    } catch { /* selector inválido */ }
  }
  return null;
};

const extractItemsFromSelector = (
  containerSel: string,
  cfg: Pick<CartExtractor, 'nameSelectors' | 'priceSelectors' | 'quantitySelectors'>,
): CartItem[] => {
  const containers = document.querySelectorAll(containerSel);
  if (containers.length === 0) return [];
  const items: CartItem[] = [];
  containers.forEach(container => {
    const name = queryTextIn(container, cfg.nameSelectors)?.replace(/\s+/g, ' ').trim() ?? '';
    const priceText = queryTextIn(container, cfg.priceSelectors) ?? container.textContent ?? '';
    const prices = parseAllPrices(priceText).filter(isSanePrice);
    const price = prices.length > 0 ? Math.min(...prices) : 0;
    const qtyEl = container.querySelector(cfg.quantitySelectors.join(', ')) as HTMLInputElement | null;
    const quantity = qtyEl ? (parseInt((qtyEl.value || qtyEl.textContent) ?? '1', 10) || 1) : 1;
    if (name && price > 0) items.push({ name: name.slice(0, 80), price, quantity });
  });
  return items;
};

export const extractCart = (): CartData | null => {
  const hostname = location.hostname.toLowerCase();
  const merchantKey = Object.keys(MERCHANT_CART_EXTRACTORS).find(k => hostname === k || hostname.endsWith('.' + k));
  const merchantCfg = merchantKey ? MERCHANT_CART_EXTRACTORS[merchantKey] : undefined;

  // Intentar extractor específico del merchant primero
  let items: CartItem[] = [];
  let total: number | null = null;

  if (merchantCfg) {
    items = extractItemsFromSelector(merchantCfg.itemSelector, merchantCfg);
    for (const sel of merchantCfg.totalSelectors) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const prices = parseAllPrices(el.textContent ?? '').filter(isSanePrice);
        if (prices.length > 0) { total = Math.max(...prices); break; }
      } catch { /* selector inválido */ }
    }
  }

  // Fallback genérico si el merchant específico no encontró nada
  if (items.length === 0) {
    for (const sel of CART_ITEM_SELECTORS) {
      try {
        const els = document.querySelectorAll(sel);
        if (els.length === 0) continue;
        els.forEach(el => {
          const nameEl = el.querySelector('a, [class*="name" i], [class*="title" i], [class*="nombre" i]');
          const name = nameEl?.textContent?.trim() ?? '';
          const prices = parseAllPrices(el.textContent ?? '').filter(isSanePrice);
          const price = prices.length > 0 ? Math.min(...prices) : 0;
          const qtyEl = el.querySelector('[class*="quantity" i], [class*="cantidad" i], input[type="number"]') as HTMLInputElement | null;
          const quantity = qtyEl ? (parseInt((qtyEl.value || qtyEl.textContent) ?? '1', 10) || 1) : 1;
          if (name && price > 0) items.push({ name: name.slice(0, 80), price, quantity });
        });
        if (items.length > 0) break;
      } catch { /* selector inválido */ }
    }
  }

  if (total === null) {
    for (const sel of CART_TOTAL_SELECTORS) {
      try {
        const el = document.querySelector(sel);
        if (!el) continue;
        const prices = parseAllPrices(el.textContent ?? '').filter(isSanePrice);
        if (prices.length > 0) { total = Math.max(...prices); break; }
      } catch { /* selector inválido */ }
    }
  }

  if (!total && items.length > 0) total = items.reduce((s, i) => s + i.price * i.quantity, 0);
  if (!total) return null;

  const cartName = items.length > 0
    ? `Carrito (${items.length} producto${items.length > 1 ? 's' : ''})`
    : 'Mi carrito de compras';

  return { isCart: true, items, total, currency: 'MXN', productName: cartName, price: total };
};
