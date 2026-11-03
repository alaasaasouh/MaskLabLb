/* Analytics must never delay checkout or receive customer details. */
(function (root) {
  function createAnalytics(browser) {
    const claimed = new Set();
    const pending = [];
    let waiting = false;

    function track(name, data) {
      // Allow a slow tracker 30 seconds to load. Do not replay on a later visit.
      pending.push({ name, data, expires: Date.now() + 30000 });
      if (!waiting) flush();
    }
    function flush() {
      waiting = false;
      while (pending.length) {
        const event = pending[0];
        if (Date.now() >= event.expires) { pending.shift(); continue; }
        if (typeof browser.umami?.track !== 'function') {
          waiting = true;
          browser.setTimeout(flush, 500);
          return;
        }
        pending.shift();
        try {
          // Never retry an ambiguous analytics response: it could count twice.
          Promise.resolve(browser.umami.track(event.name, event.data)).catch(() => {});
        } catch { /* Analytics failure must not affect orders or WhatsApp. */ }
      }
    }

    function orderCompleted(orderId, totalCents) {
      if (!/^ML-[A-F0-9]{16}$/.test(orderId || '') || !Number.isSafeInteger(totalCents) || totalCents < 0) return;
      const key = 'masklab-tracked-order:' + orderId;
      if (claimed.has(key)) return;
      try { if (browser.localStorage.getItem(key)) return; } catch { /* In-memory deduplication still works. */ }
      // Claim before sending, favoring a missed event over duplicate revenue.
      // This reference stays in this browser; it is never sent to Umami.
      claimed.add(key);
      try { browser.localStorage.setItem(key, '1'); } catch { /* Storage can be blocked or full. */ }
      track('order-completed', { revenue: totalCents / 100, currency: 'USD' });
    }
    function whatsappCheckout(totalCents) {
      if (!Number.isSafeInteger(totalCents) || totalCents < 0) return;
      track('whatsapp-checkout', { cart_value: totalCents / 100, currency: 'USD' });
    }
    return { orderCompleted, whatsappCheckout };
  }
  if (typeof module !== 'undefined') module.exports = createAnalytics;
  else root.MasklabAnalytics = createAnalytics(root);
})(typeof window !== 'undefined' ? window : globalThis);
