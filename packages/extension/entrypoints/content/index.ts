import { getActiveMerchant, hasAllowedTld, isBlacklisted } from './detector';
import { extractPriceAndProduct } from './extractor';
import { renderWidget } from './widget';

export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    console.log('Kueski content script running.');

    let injected = false;

    const injectWidget = async () => {
      if (injected || document.querySelector('[data-kp="1"]')) return;

      const hostname = location.hostname.toLowerCase();

      // 1. TLD gate (antes de pegarle a la DB)
      if (!hasAllowedTld(hostname)) return;

      // 2. Blacklist
      if (await isBlacklisted(hostname)) {
        console.warn('Kueski: dominio en blacklist.');
        return;
      }

      // 3. Merchant activo
      const merchant = await getActiveMerchant(hostname);
      if (!merchant) return;

      // 4. Precio
      const data = extractPriceAndProduct(merchant);
      if (!data || data.price < 100) return;

      injected = true;
      document.body.appendChild(renderWidget(merchant, data));
      console.log(`Kueski widget inyectado: ${merchant.name} @ ${data.price}`);
    };

    const tryInject = () => setTimeout(injectWidget, 1500);

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', tryInject);
    } else {
      tryInject();
    }

    // SPA observer: debounced para no ejecutar en cada mutación del DOM.
    // Solo actuamos cuando la URL cambia (SPA navigation).
    let lastUrl = location.href;
    let pending = 0;
    const onMutation = () => {
      if (pending) return;
      pending = window.setTimeout(() => {
        pending = 0;
        if (location.href === lastUrl) return;
        lastUrl = location.href;
        injected = false;
        document.querySelector('[data-kp="1"]')?.remove();
        setTimeout(injectWidget, 2000);
      }, 250);
    };
    new MutationObserver(onMutation).observe(document.body, { childList: true, subtree: true });
  },
});
