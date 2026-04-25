import { getActiveMerchant, hasAllowedTld, isBlacklisted, isKueskiPayPartner } from './detector';
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

      // 1. TLD gate
      if (!hasAllowedTld(hostname)) return;

      // 2. Blacklist
      if (await isBlacklisted(hostname)) {
        console.warn('Kueski: dominio en blacklist.');
        return;
      }

      // 3. Intentar obtener merchant de Supabase (opcional — aporta cashback y nombre)
      //    No bloqueamos si no está registrado; el widget funciona igual.
      const merchant = await getActiveMerchant(hostname);

      // 4. Extraer precio y producto de la página (funciona en cualquier tienda)
      const data = extractPriceAndProduct();
      if (!data || data.price < 100) return;

      // 5. Determinar si es un partner oficial de Kueski Pay
      //    (Supabase merchant activo OR en la lista hardcoded de convenios)
      const isPartner = !!merchant || isKueskiPayPartner(hostname);

      injected = true;
      document.body.appendChild(renderWidget(merchant, data, isPartner));
      console.log(
        `Kueski widget inyectado: ${data.productName} @ ${data.price} MXN` +
        (isPartner ? ' [Kueski Pay Partner]' : ' [modo genérico]'),
      );
    };

    const tryInject = () => setTimeout(injectWidget, 1500);

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', tryInject);
    } else {
      tryInject();
    }

    // SPA observer: solo actúa cuando cambia la URL
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

    // Mensajes desde el popup — responde siempre que haya producto, aunque el merchant
    // no esté en Supabase (mode genérico).
    // IMPORTANTE: no usar async aquí. Chrome cierra el canal de mensajes cuando el listener
    // retorna, por lo que sendResponse llegaría tarde. Retornar `true` mantiene el canal abierto.
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message.action === 'GET_PRODUCT_INFO') {
        const hostname = location.hostname.toLowerCase();
        getActiveMerchant(hostname)
          .then(merchant => extractPriceAndProduct())
          .then(productInfo => sendResponse(productInfo ?? null))
          .catch(() => sendResponse(null));
        return true; // mantiene el canal abierto para la respuesta async
      }
    });
  },
});
