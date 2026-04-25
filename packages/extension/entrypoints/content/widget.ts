import type { Merchant } from 'shared/models';
import type { ExtractedData } from './types';

const fmt = (n: number) =>
  '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STYLES = `
  :host { all: initial; }
  * { box-sizing: border-box; margin: 0; padding: 0; }

  .kueski-btn {
    display: flex; align-items: center; gap: 10px;
    background: linear-gradient(135deg, #0050CC 0%, #0075FF 100%);
    color: white; border: none; border-radius: 50px;
    padding: 12px 20px; cursor: pointer;
    box-shadow: 0 4px 20px rgba(0,117,255,0.45);
    font-size: 14px; font-weight: 700; font-family: system-ui, sans-serif;
    transition: transform 0.2s, box-shadow 0.2s;
    white-space: nowrap;
  }
  .kueski-btn:hover { transform: scale(1.05); box-shadow: 0 6px 28px rgba(0,117,255,0.6); }
  .kueski-btn svg { flex-shrink: 0; }
  .kueski-badge {
    background: #00E59B; color: #0a1628; font-size: 11px;
    font-weight: 800; padding: 2px 8px; border-radius: 20px;
  }

  /* Toast de notificación "Esta tienda acepta Kueski Pay" */
  .kueski-toast {
    position: absolute;
    bottom: calc(100% + 10px);
    right: 0;
    background: white;
    border: 1.5px solid #00C473;
    border-radius: 12px;
    padding: 8px 14px;
    display: flex;
    align-items: center;
    gap: 8px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.14);
    font-size: 12px;
    font-weight: 700;
    font-family: system-ui, sans-serif;
    white-space: nowrap;
    color: #063a1f;
    pointer-events: none;
    animation: toastIn 0.4s ease 0.6s both, toastOut 0.4s ease 5.5s forwards;
  }
  .kueski-toast .toast-dot {
    width: 8px; height: 8px; border-radius: 50%;
    background: #00C473; flex-shrink: 0;
    box-shadow: 0 0 0 2px rgba(0,196,115,0.3);
    animation: pulse 1.5s ease infinite 1s;
  }
  @keyframes pulse {
    0%, 100% { box-shadow: 0 0 0 2px rgba(0,196,115,0.3); }
    50%       { box-shadow: 0 0 0 5px rgba(0,196,115,0.15); }
  }
  @keyframes toastIn {
    from { opacity: 0; transform: translateX(14px); }
    to   { opacity: 1; transform: translateX(0); }
  }
  @keyframes toastOut {
    from { opacity: 1; }
    to   { opacity: 0; }
  }

  .kueski-panel {
    position: absolute; bottom: 64px; right: 0;
    width: 340px; background: white; border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.18);
    overflow: hidden; display: none;
    animation: slideUp 0.25s ease;
    border: 1px solid rgba(0,117,255,0.12);
  }
  .kueski-panel.open { display: block; }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(10px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .panel-header {
    background: linear-gradient(135deg, #0050CC 0%, #0075FF 100%);
    padding: 16px; color: white; position: relative;
  }
  .panel-header h3 { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
  .panel-header .subtitle { font-size: 11px; opacity: 0.85; }
  .panel-header .price-big { font-size: 26px; font-weight: 900; margin: 8px 0 2px; }
  .panel-header .price-label { font-size: 11px; opacity: 0.8; }

  .partner-banner {
    display: flex; align-items: center; gap: 6px; margin-top: 8px;
    background: rgba(0,196,115,0.2); border: 1px solid rgba(0,196,115,0.5);
    border-radius: 8px; padding: 5px 10px;
    font-size: 11px; font-weight: 700; color: #c8ffe8;
  }
  .partner-banner[hidden] { display: none; }

  .cashback-tag {
    display: inline-block; margin-top: 6px;
    background: #00E59B; color: #0a1628; font-size: 11px;
    font-weight: 800; padding: 2px 8px; border-radius: 20px;
  }
  .cashback-tag[hidden] { display: none; }

  .panel-body { padding: 12px; display: flex; flex-direction: column; gap: 8px; }

  .option {
    border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 10px 12px;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
    display: flex; justify-content: space-between; align-items: center;
  }
  .option:hover { border-color: #0075FF; background: #f0f7ff; }
  .option.featured { border-color: #0075FF; background: #f0f7ff; }
  .option-left .periods { font-size: 13px; font-weight: 700; color: #111; }
  .option-left .per { font-size: 11px; color: #666; }
  .option-right { text-align: right; }
  .option-right .amount { font-size: 16px; font-weight: 800; color: #0075FF; }
  .option-right .zero { font-size: 10px; font-weight: 700; color: #00b87a; background: #e6faf3; padding: 2px 6px; border-radius: 10px; }
  .rec-tag { font-size: 10px; font-weight: 700; color: white; background: #0075FF; padding: 2px 7px; border-radius: 8px; margin-left: 6px; }

  .cta-btn {
    width: 100%; padding: 12px;
    background: linear-gradient(135deg, #0050CC 0%, #0075FF 100%);
    color: white; border: none; border-radius: 10px;
    font-size: 14px; font-weight: 800; cursor: pointer;
    transition: opacity 0.2s; font-family: system-ui, sans-serif; margin-top: 4px;
  }
  .cta-btn:hover { opacity: 0.9; }
  .disclaimer { font-size: 10px; color: #999; text-align: center; padding: 8px 12px; border-top: 1px solid #f0f0f0; }

  .close-btn {
    position: absolute; top: 10px; right: 10px;
    background: rgba(255,255,255,0.2); border: none; border-radius: 50%;
    width: 24px; height: 24px; cursor: pointer; color: white;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px; font-family: system-ui, sans-serif; line-height: 1;
  }
  .close-btn:hover { background: rgba(255,255,255,0.35); }
`;

// Construimos via createElement para evitar XSS desde datos externos.
const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  opts: { class?: string; text?: string; html?: string; attrs?: Record<string, string> } = {},
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (opts.class) node.className = opts.class;
  if (opts.text !== undefined) node.textContent = opts.text;
  if (opts.html !== undefined) node.innerHTML = opts.html; // Solo markup estático controlado.
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) node.setAttribute(k, v);
  return node;
};

interface Installment { periods: number; amount: number; }

const buildOption = (o: Installment, price: number, featured: boolean): HTMLElement => {
  const wrap = el('div', { class: 'option' + (featured ? ' featured' : ''), attrs: { 'data-periods': String(o.periods) } });

  const left = el('div', { class: 'option-left' });
  const periods = el('div', { class: 'periods', text: `${o.periods} quincenas` });
  if (featured) periods.appendChild(el('span', { class: 'rec-tag', text: 'Recomendado' }));
  left.appendChild(periods);
  left.appendChild(el('div', { class: 'per', text: `Total: ${fmt(price)}` }));

  const right = el('div', { class: 'option-right' });
  right.appendChild(el('div', { class: 'amount', text: fmt(o.amount) }));
  right.appendChild(el('div', { class: 'zero', text: '0% interés' }));

  wrap.appendChild(left);
  wrap.appendChild(right);
  return wrap;
};

// merchant puede ser null en tiendas no registradas en Supabase (modo genérico).
// isPartner indica que hay convenio oficial con Kueski Pay.
export const renderWidget = (merchant: Merchant | null, data: ExtractedData, isPartner: boolean): HTMLElement => {
  const price = data.price;
  const options: Installment[] = [
    { periods: 4,  amount: price / 4 },
    { periods: 6,  amount: price / 6 },
    { periods: 8,  amount: price / 8 },
    { periods: 12, amount: price / 12 },
  ];

  const productShort = data.productName.length > 50
    ? data.productName.slice(0, 50) + '…'
    : data.productName;

  const hostId = 'kp-' + Math.random().toString(36).slice(2, 10);
  const container = el('div', { attrs: { id: hostId, 'data-kp': '1' } });
  container.style.cssText =
    'all:initial;position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;';

  const shadow = container.attachShadow({ mode: 'open' });
  shadow.appendChild(el('style', { text: STYLES }));

  // Toast "Esta tienda acepta Kueski Pay" — aparece automáticamente si es partner
  if (isPartner) {
    const toast = el('div', { class: 'kueski-toast' });
    toast.appendChild(el('span', { class: 'toast-dot' }));
    toast.appendChild(document.createTextNode('Esta tienda acepta Kueski Pay'));
    shadow.appendChild(toast);
  }

  // Panel
  const panel = el('div', { class: 'kueski-panel', attrs: { id: 'panel' } });

  const header = el('div', { class: 'panel-header' });
  const closeBtn = el('button', { class: 'close-btn', text: '✕', attrs: { id: 'closePanel', type: 'button' } });
  header.appendChild(closeBtn);
  header.appendChild(el('h3', { text: '💳 Paga con Kueski Pay' }));
  header.appendChild(el('p', { class: 'subtitle', text: productShort }));

  const priceBig = el('div', { class: 'price-big', text: fmt(options[0].amount) });
  const priceLabel = el('div', { class: 'price-label', text: 'por quincena · 4 quincenas · 0% interés' });
  header.appendChild(priceBig);
  header.appendChild(priceLabel);

  // Banner de partner dentro del panel (visible siempre al abrir)
  if (isPartner) {
    const banner = el('div', { class: 'partner-banner' });
    banner.appendChild(el('span', { html: '✓' }));
    banner.appendChild(document.createTextNode(' Kueski Pay aceptado en esta tienda'));
    header.appendChild(banner);
  }

  if (merchant && merchant.cashbackPercent > 0) {
    header.appendChild(el('span', {
      class: 'cashback-tag',
      text: `🎁 ${merchant.cashbackPercent}% cashback en ${merchant.name}`,
    }));
  }
  panel.appendChild(header);

  const body = el('div', { class: 'panel-body' });
  options.forEach((o, i) => body.appendChild(buildOption(o, price, i === 0)));
  const ctaBtn = el('button', {
    class: 'cta-btn',
    text: '⚡ Solicitar con Kueski Pay',
    attrs: { id: 'ctaBtn', type: 'button' },
  });
  body.appendChild(ctaBtn);
  panel.appendChild(body);

  panel.appendChild(el('div', {
    class: 'disclaimer',
    text: 'Sin tarjeta de crédito · Aprobación inmediata · 100% digital',
  }));

  shadow.appendChild(panel);

  // Botón flotante
  const mainBtn = el('button', { class: 'kueski-btn', attrs: { id: 'mainBtn', type: 'button' } });
  mainBtn.innerHTML =
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="2">' +
    '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>';
  mainBtn.appendChild(document.createTextNode(' Pagar con Kueski '));
  mainBtn.appendChild(el('span', { class: 'kueski-badge', text: `${fmt(options[0].amount)}/qna` }));
  shadow.appendChild(mainBtn);

  // Listeners
  mainBtn.addEventListener('click', () => panel.classList.toggle('open'));
  closeBtn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.remove('open');
  });

  shadow.querySelectorAll('.option').forEach(opt => {
    opt.addEventListener('click', () => {
      shadow.querySelectorAll('.option').forEach(o => o.classList.remove('featured'));
      opt.classList.add('featured');
      const periods = parseInt((opt as HTMLElement).dataset.periods || '4');
      const selected = options.find(o => o.periods === periods);
      if (!selected) return;
      priceBig.textContent = fmt(selected.amount);
      priceLabel.textContent = `por quincena · ${periods} quincenas · 0% interés`;
    });
  });

  ctaBtn.addEventListener('click', () => {
    window.open('https://kueski.com/kueski-pay', '_blank', 'noopener,noreferrer');
  });

  return container;
};
