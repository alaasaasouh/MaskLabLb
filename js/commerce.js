/* Pure cart and pricing functions, shared by the browser and Node checks. */
(function (root) {
  const config = root.MASKLAB || require('./products.js');
  const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: config.product.currency, maximumFractionDigits: 2 }).format(cents / 100);
  function sanitizeCart(value) {
    if (!Array.isArray(value)) return [];
    const quantities = new Map();
    value.forEach(item => {
      if (!item || !config.designs.some(d => d.id === item.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1) return;
      quantities.set(item.id, Math.min(99, (quantities.get(item.id) || 0) + item.quantity));
    });
    return [...quantities].map(([id, quantity]) => ({ id, quantity }));
  }
  function priceCart(cart) {
    const items = sanitizeCart(cart);
    const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = quantity * config.product.unitPrice;
    const needsQuote = quantity > 3 && config.pricing.aboveThree === 'quote';
    const total = needsQuote ? null : (config.pricing.bundles[quantity] ?? subtotal);
    return { quantity, subtotal, total, savings: total === null ? null : subtotal - total, needsQuote };
  }
  function buildMessage(cart, customer) {
    const items = sanitizeCart(cart);
    if (!items.length) throw new Error('Add a mask before preparing your order.');
    const price = priceCart(items);
    const lines = ['*NEW MASKLAB WEBSITE ORDER*', '', 'Hello MASKLAB! I would like to place the following order:', '', '*ORDER DETAILS*'];
    items.forEach(item => {
      const design = config.designs.find(d => d.id === item.id);
      lines.push(`${design.name} × ${item.quantity}`, `Unit price: ${money(config.product.unitPrice)} | Before bundle savings: ${money(item.quantity * config.product.unitPrice)}`, '');
    });
    lines.push('*ORDER SUMMARY*', `Total masks: ${price.quantity}`, `Subtotal before bundle savings: ${money(price.subtotal)}`,
      `Bundle savings: ${price.needsQuote ? 'To confirm (order above 3 masks)' : money(price.savings)}`,
      `Merchandise total: ${price.needsQuote ? 'Please quote this order' : money(price.total)}`,
      'Delivery fee: To be confirmed through WhatsApp.', '', '*CUSTOMER DETAILS*',
      `Name: ${customer.name.trim()}`, `Phone: ${customer.phone.trim()}`, `City / area: ${customer.area.trim()}`, `Delivery address: ${customer.address.trim()}`);
    if (customer.building?.trim()) lines.push(`Building / apartment: ${customer.building.trim()}`);
    if (customer.notes?.trim()) lines.push(`Notes: ${customer.notes.trim()}`);
    lines.push('', 'Please confirm availability, the final delivery charge, and payment method. Thank you!');
    return lines.join('\n');
  }
  const api = { money, sanitizeCart, priceCart, buildMessage };
  root.MasklabCommerce = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
