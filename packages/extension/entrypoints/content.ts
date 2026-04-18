export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Kueski content script running.');

    // ─── Helpers ────────────────────────────────────────────────────────────────
    const SUPPORTED_DOMAINS = [
      'amazon.com', 'amazon.com.mx',
      'mercadolibre.com', 'mercadolibre.com.mx',
      'aliexpress.com',
    ];

    const isSupportedDomain = () =>
      SUPPORTED_DOMAINS.some(d => location.hostname.includes(d));

    /** Returns the first non-null text from a list of CSS selectors */
    const queryText = (selectors: string[]): string | null => {
      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) return el.textContent.trim();
      }
      return null;
    };

    // ─── Price extraction per platform ──────────────────────────────────────────
    const extractPriceAndProduct = (): { price: number; productName: string; currency: string } | null => {
      const hostname = location.hostname;

      // ── Amazon ──────────────────────────────────────────────────────────────
      if (hostname.includes('amazon')) {
        const priceText = queryText([
          '.a-price .a-offscreen',
          '#priceblock_ourprice',
          '#priceblock_dealprice',
          '.apexPriceToPay .a-offscreen',
          '#corePrice_feature_div .a-offscreen',
          '.priceToPay .a-offscreen',
        ]);
        const productName = queryText([
          '#productTitle',
          'h1.product-title-word-break',
        ]);
        if (priceText) {
          const match = priceText.match(/[\d,]+\.?\d*/);
          if (match) {
            const price = parseFloat(match[0].replace(/,/g, ''));
            if (price > 0) {
              return { price, productName: productName || 'Producto Amazon', currency: 'MXN' };
            }
          }
        }
      }

      // ── MercadoLibre ─────────────────────────────────────────────────────────
      if (hostname.includes('mercadolibre')) {
        const priceText = queryText([
          '.andes-money-amount__fraction',
          '.ui-pdp-price__second-line .andes-money-amount__fraction',
          '[data-testid="price-component"] .andes-money-amount__fraction',
        ]);
        const productName = queryText([
          '.ui-pdp-title',
          'h1.ui-pdp-title',
        ]);
        if (priceText) {
          const price = parseFloat(priceText.replace(/[.,]/g, d => d === '.' ? '.' : ''));
          const clean = parseFloat(priceText.replace(/\./g, '').replace(',', '.'));
          const finalPrice = clean > 0 ? clean : price;
          if (finalPrice > 0) {
            return { price: finalPrice, productName: productName || 'Producto MercadoLibre', currency: 'MXN' };
          }
        }
      }

      // ── AliExpress ───────────────────────────────────────────────────────────
      if (hostname.includes('aliexpress')) {
        const priceText = queryText([
          '.product-price-value',
          '[class*="price--originalPrice"]',
          '[class*="uniformBanner--price"]',
          '.pdp-price',
        ]);
        const productName = queryText([
          '.product-title-text',
          'h1[data-pl="product-title"]',
          'h1',
        ]);
        if (priceText) {
          const match = priceText.match(/[\d.]+/);
          if (match) {
            const priceUSD = parseFloat(match[0]);
            // Convert USD → MXN approx
            const priceMXN = priceUSD * 17.5;
            if (priceMXN > 0) {
              return { price: Math.round(priceMXN), productName: productName || 'Producto AliExpress', currency: 'MXN' };
            }
          }
        }
      }

      return null;
    };

    // ─── Widget injection ────────────────────────────────────────────────────────
    let injected = false;

    const injectWidget = () => {
      if (injected || document.getElementById('kueski-root')) return;
      if (!isSupportedDomain()) return;

      const data = extractPriceAndProduct();
      if (!data || data.price < 100) return; // Only for meaningful prices

      injected = true;

      // Container
      const container = document.createElement('div');
      container.id = 'kueski-root';
      container.style.cssText = 'all:initial;position:fixed;bottom:24px;right:24px;z-index:2147483647;font-family:system-ui,-apple-system,sans-serif;';

      // Shadow DOM for style isolation
      const shadow = container.attachShadow({ mode: 'open' });

      const styles = `
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
          padding: 16px; color: white;
        }
        .panel-header h3 { font-size: 14px; font-weight: 800; margin-bottom: 4px; }
        .panel-header .subtitle { font-size: 11px; opacity: 0.85; }
        .panel-header .price-big { font-size: 26px; font-weight: 900; margin: 8px 0 2px; }
        .panel-header .price-label { font-size: 11px; opacity: 0.8; }

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
        .option-right .amount { font-size: 16px; font-weight: 800; color: #0075FF; }
        .option-right .zero { font-size: 10px; font-weight: 700; color: #00b87a; background: #e6faf3; padding: 2px 6px; border-radius: 10px; }
        .rec-tag { font-size: 10px; font-weight: 700; color: white; background: #0075FF; padding: 2px 7px; border-radius: 8px; margin-left: 6px; }

        .cta-btn {
          width: 100%; padding: 12px; background: linear-gradient(135deg, #0050CC 0%, #0075FF 100%);
          color: white; border: none; border-radius: 10px; font-size: 14px; font-weight: 800;
          cursor: pointer; transition: opacity 0.2s; font-family: system-ui, sans-serif;
          margin-top: 4px;
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

      const fmt = (n: number) =>
        '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const price = data.price;
      const options = [
        { periods: 4,  amount: price / 4 },
        { periods: 6,  amount: price / 6 },
        { periods: 8,  amount: price / 8 },
        { periods: 12, amount: price / 12 },
      ];

      shadow.innerHTML = `
        <style>${styles}</style>
        <div class="kueski-panel" id="panel">
          <div class="panel-header" style="position:relative">
            <button class="close-btn" id="closePanel">✕</button>
            <h3>💳 Paga con Kueski Pay</h3>
            <p class="subtitle">${data.productName.slice(0, 50)}${data.productName.length > 50 ? '…' : ''}</p>
            <div class="price-big">${fmt(options[0].amount)}</div>
            <div class="price-label">por quincena · 4 quincenas · 0% interés</div>
          </div>
          <div class="panel-body">
            ${options.map((o, i) => `
              <div class="option${i === 0 ? ' featured' : ''}" data-periods="${o.periods}">
                <div class="option-left">
                  <div class="periods">${o.periods} quincenas${i === 0 ? '<span class="rec-tag">Recomendado</span>' : ''}</div>
                  <div class="per">Total: ${fmt(price)}</div>
                </div>
                <div class="option-right" style="text-align:right">
                  <div class="amount">${fmt(o.amount)}</div>
                  <div class="zero">0% interés</div>
                </div>
              </div>
            `).join('')}
            <button class="cta-btn" id="ctaBtn">⚡ Solicitar con Kueski Pay</button>
          </div>
          <div class="disclaimer">Sin tarjeta de crédito · Aprobación inmediata · 100% digital</div>
        </div>

        <button class="kueski-btn" id="mainBtn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFD700" stroke="#FFD700" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          Pagar con Kueski
          <span class="kueski-badge">${fmt(options[0].amount)}/qna</span>
        </button>
      `;

      const panel = shadow.getElementById('panel')!;
      const mainBtn = shadow.getElementById('mainBtn')!;
      const closePanel = shadow.getElementById('closePanel')!;
      const ctaBtn = shadow.getElementById('ctaBtn')!;

      mainBtn.addEventListener('click', () => panel.classList.toggle('open'));
      closePanel.addEventListener('click', e => { e.stopPropagation(); panel.classList.remove('open'); });

      // Option selection highlight
      shadow.querySelectorAll('.option').forEach(opt => {
        opt.addEventListener('click', () => {
          shadow.querySelectorAll('.option').forEach(o => o.classList.remove('featured'));
          opt.classList.add('featured');
          const periods = parseInt((opt as HTMLElement).dataset.periods || '4');
          const selectedOpt = options.find(o => o.periods === periods);
          if (selectedOpt) {
            const header = shadow.querySelector('.price-big') as HTMLElement;
            const headerLabel = shadow.querySelector('.price-label') as HTMLElement;
            if (header) header.textContent = fmt(selectedOpt.amount);
            if (headerLabel) headerLabel.textContent = `por quincena · ${periods} quincenas · 0% interés`;
          }
        });
      });

      ctaBtn.addEventListener('click', () => {
        window.open('https://kueski.com/kueski-pay', '_blank');
      });

      document.body.appendChild(container);
      console.log('Kueski widget injected for:', data.productName, '@', fmt(price));
    };

    // ─── Initialization & SPA observer ──────────────────────────────────────────
    const tryInject = () => {
      if (!isSupportedDomain()) return;
      // Wait a bit for dynamic content to load
      setTimeout(injectWidget, 1500);
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', tryInject);
    } else {
      tryInject();
    }

    // SPA navigation (pushState, hashchange)
    let lastUrl = location.href;
    new MutationObserver(() => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        injected = false;
        const old = document.getElementById('kueski-root');
        if (old) old.remove();
        setTimeout(injectWidget, 2000);
      }
    }).observe(document.body, { childList: true, subtree: true });
  },
});