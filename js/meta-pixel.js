/* Advertising is opt-in. No customer form fields are passed to Meta. */
(function (root) {
  function createPixel(browser, config = {}) {
    const pixelId = String(config.pixelId || '').trim();
    const valid = /^\d{5,20}$/.test(pixelId);
    let consent = false;
    let initialized = false;
    let lastPage = null;
    let navigationInstalled = false;
    const purchases = new Set();

    function command(...args) {
      try { browser.fbq(...args); return true; } catch { return false; }
    }
    function start() {
      if (initialized) return true;
      try {
        // One owner per page. Do not initialize over an unknown/manual/GTM pixel.
        if (browser.fbq || browser._fbq || browser.document.querySelector('script[src*="connect.facebook.net/"]')) return false;
        const fbq = function () {
          if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
          else fbq.queue.push(arguments);
        };
        fbq.push = fbq;
        fbq.loaded = true;
        fbq.version = '2.0';
        fbq.queue = [];
        // We own PageView dispatch, including History API navigation.
        fbq.disablePushState = true;
        browser.fbq = browser._fbq = fbq;
        command('consent', 'revoke');
        command('set', 'autoConfig', false, pixelId);
        command('init', pixelId);
        const script = browser.document.createElement('script');
        script.async = true;
        script.src = 'https://connect.facebook.net/en_US/fbevents.js';
        browser.document.head.appendChild(script);
        initialized = true;
        installNavigation();
        return true;
      } catch { return false; } // Blocked trackers must never interrupt shopping.
    }
    function track(name, data, options) {
      if (!consent || !valid || !initialized) return false;
      return command('trackSingle', pixelId, name, data || {}, ...(options ? [options] : []));
    }
    function pageView() {
      // This is a one-page storefront: #shop/#contact are scroll anchors.
      // Treat a changed path/query as a route; repeated URLs are not new views.
      const page = (browser.location?.pathname || '/') + (browser.location?.search || '');
      if (page !== lastPage && track('PageView')) lastPage = page;
    }
    function installNavigation() {
      if (navigationInstalled) return;
      navigationInstalled = true;
      browser.addEventListener?.('popstate', pageView);
      for (const name of ['pushState', 'replaceState']) {
        const original = browser.history?.[name];
        if (typeof original !== 'function') continue;
        browser.history[name] = function (...args) {
          const result = original.apply(this, args);
          pageView();
          return result;
        };
      }
    }
    function setConsent(granted) {
      consent = granted === true;
      if (!consent) {
        if (initialized) command('consent', 'revoke');
        return;
      }
      if (!valid || !start()) return;
      command('consent', 'grant');
      pageView();
    }
    function productData(id, quantity = 1) {
      const shop = browser.MASKLAB;
      const design = shop?.designs.find(item => item.id === id);
      if (!design || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) return null;
      return { content_ids: [id], content_type: 'product', content_name: design.name,
        contents: [{ id, quantity }], num_items: quantity,
        value: shop.product.unitPrice * quantity / 100, currency: shop.product.currency };
    }
    function viewContent(id) {
      const data = productData(id);
      if (data) track('ViewContent', data);
    }
    function addToCart(id, quantity) {
      const data = productData(id, quantity);
      if (data && browser.MASKLAB.designs.find(item => item.id === id).available !== false) track('AddToCart', data);
    }
    function cartData(cart) {
      const commerce = browser.MasklabCommerce;
      const items = commerce.sanitizeCart(cart);
      if (!items.length) return null;
      const price = commerce.priceCart(items);
      return { content_ids: items.map(item => item.id), content_type: 'product',
        contents: items, num_items: price.quantity, value: price.grandTotal / 100,
        currency: browser.MASKLAB.product.currency };
    }
    function initiateCheckout(cart) {
      const data = cartData(cart);
      if (data) track('InitiateCheckout', data);
    }
    function purchaseConfirmed(result, cart) {
      // The current email endpoint returns receipt of a REQUEST, not confirmation.
      // A future authoritative order-confirmation response must opt in explicitly.
      if (!consent || result?.orderStatus !== 'confirmed' || result.ok !== true ||
          !/^ML-[A-F0-9]{16}$/.test(result.orderId || '') ||
          !Number.isSafeInteger(result.grandTotal) || result.grandTotal < 0) return;
      const data = cartData(cart);
      if (!data) return;
      const key = 'masklab-meta-purchase:' + pixelId + ':' + result.orderId;
      if (purchases.has(key)) return;
      try { if (browser.localStorage.getItem(key)) return; } catch { /* Memory fallback. */ }
      if (!track('Purchase', { ...data, value: result.grandTotal / 100 }, {eventID: result.orderId})) return;
      purchases.add(key);
      try { browser.localStorage.setItem(key, '1'); } catch { /* Memory fallback. */ }
    }
    return { setConsent, viewContent, addToCart, initiateCheckout, purchaseConfirmed };
  }
  if (typeof module !== 'undefined') module.exports = createPixel;
  else if (!root.MasklabMetaPixel) root.MasklabMetaPixel = createPixel(root, root.MASKLAB_META);
})(typeof window !== 'undefined' ? window : globalThis);
