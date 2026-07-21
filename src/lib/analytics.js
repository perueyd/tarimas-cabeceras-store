// Analíticas opcionales: Google Analytics 4 y Meta Pixel.
// No hacen nada hasta que pongas tus IDs en las variables de entorno de Vercel:
//   VITE_GA_MEASUREMENT_ID   (empieza con "G-...")
//   VITE_META_PIXEL_ID       (número de tu píxel de Meta)
// Ver GUIA-EDICION.md para instrucciones de dónde conseguir cada uno.

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;
const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID;

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  initialized = true;

  if (GA_ID) {
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // send_page_view en false: cada navegación de la SPA se envía manualmente (ver trackPageView).
    window.gtag('config', GA_ID, { send_page_view: false });
  }

  if (PIXEL_ID) {
    /* eslint-disable */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = true; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    window.fbq('init', PIXEL_ID);
  }
}

export function trackPageView(path) {
  if (GA_ID && window.gtag) {
    window.gtag('event', 'page_view', { page_path: path });
  }
  if (PIXEL_ID && window.fbq) {
    window.fbq('track', 'PageView');
  }
}

// Eventos del embudo de venta: agregar al carrito, iniciar checkout, compra.
export function trackAddToCart(item) {
  if (GA_ID && window.gtag) {
    window.gtag('event', 'add_to_cart', {
      currency: 'PEN',
      value: item.unitPrice * item.qty,
      items: [{ item_id: item.productId, item_name: item.productName, quantity: item.qty, price: item.unitPrice }],
    });
  }
  if (PIXEL_ID && window.fbq) {
    window.fbq('track', 'AddToCart', {
      content_ids: [item.productId],
      content_name: item.productName,
      currency: 'PEN',
      value: item.unitPrice * item.qty,
    });
  }
}

export function trackBeginCheckout(totalAmount) {
  if (GA_ID && window.gtag) {
    window.gtag('event', 'begin_checkout', { currency: 'PEN', value: totalAmount });
  }
  if (PIXEL_ID && window.fbq) {
    window.fbq('track', 'InitiateCheckout', { currency: 'PEN', value: totalAmount });
  }
}

export function trackPurchase(orderCode, totalAmount) {
  if (GA_ID && window.gtag) {
    window.gtag('event', 'purchase', { transaction_id: orderCode, currency: 'PEN', value: totalAmount });
  }
  if (PIXEL_ID && window.fbq) {
    window.fbq('track', 'Purchase', { currency: 'PEN', value: totalAmount });
  }
}
