export default defineContentScript({
  matches: ['<all_urls>'],
  main() {
    console.log('Kueski content script running.');

    // Look for prices to identify products/checkouts
    const checkPriceAndInject = () => {
      if (document.getElementById('kueski-floating-widget')) return;

      const bodyText = document.body.textContent || '';
      // Basic regex to detect price patterns (e.g. $1,000.00)
      const priceRegex = /\$[\d,]+\.\d{2}/;

      const hasAddToCart = /add to cart|agregar al carrito|comprar|checkout/i.test(bodyText);

      if (priceRegex.test(bodyText) && hasAddToCart) {
        injectFloatingWidget();
      }
    };

    const injectFloatingWidget = () => {
      const widget = document.createElement('div');
      widget.id = 'kueski-floating-widget';
      widget.style.position = 'fixed';
      widget.style.bottom = '20px';
      widget.style.right = '20px';
      widget.style.zIndex = '999999';
      widget.style.backgroundColor = '#0075FF';
      widget.style.color = 'white';
      widget.style.padding = '12px 20px';
      widget.style.borderRadius = '30px';
      widget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
      widget.style.cursor = 'pointer';
      widget.style.fontFamily = 'system-ui, -apple-system, sans-serif';
      widget.style.fontWeight = 'bold';
      widget.style.display = 'flex';
      widget.style.alignItems = 'center';
      widget.style.gap = '8px';
      widget.style.transition = 'transform 0.2s';

      widget.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="yellow" stroke="yellow" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        Paga con Kueski
      `;

      widget.onmouseover = () => { widget.style.transform = 'scale(1.05)'; };
      widget.onmouseout = () => { widget.style.transform = 'scale(1)'; };

      widget.onclick = () => {
        // En una app real, esto abriría el popup/iframe de la extensión
        console.log('Kueski widget clicked');
        alert('Kueski Widget: Abriendo simulador de pagos...');
      };

      document.body.appendChild(widget);
      console.log('Kueski floating widget injected.');
    };

    // Run on load
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', checkPriceAndInject);
    } else {
      checkPriceAndInject();
    }

    // Observe changes in case it's an SPA
    let debounceTimer: ReturnType<typeof setTimeout>;
    const observer = new MutationObserver((mutations) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        checkPriceAndInject();
      }, 500);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  },
});
