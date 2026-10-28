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
    const needsQuote = false;
    // Keep the repeating per-mask rate exact until rounding the order to cents.
    const total = quantity >= 3 ? Math.round(quantity * config.pricing.bundles[3] / 3) : (config.pricing.bundles[quantity] ?? subtotal);
    const delivery = quantity && total <= config.pricing.freeDeliveryAbove ? config.pricing.deliveryFee : 0;
    return { quantity, subtotal, total, delivery, grandTotal: total + delivery, savings: subtotal - total, needsQuote };
  }
  function pricedItems(cart) {
    const items = sanitizeCart(cart);
    const price = priceCart(items);
    let count = 0;
    return items.map(item => {
      const previous = Math.round(count * price.total / price.quantity);
      count += item.quantity;
      return { ...item, total: Math.round(count * price.total / price.quantity) - previous };
    });
  }
  function unitRate(cart) {
    const { quantity } = priceCart(cart);
    return quantity >= 3 ? '$' + (config.pricing.bundles[3] / 300).toFixed(3) + ' approx.' : money(quantity === 2 ? config.pricing.bundles[2] / 2 : config.product.unitPrice);
  }
  function buildMessage(cart, customer) {
    const items = sanitizeCart(cart);
    if (!items.length) throw new Error('Add a mask before preparing your order.');
    const price = priceCart(items);
    const lines = ['*NEW MASKLAB WEBSITE ORDER*', '', 'Hello MASKLAB! I would like to place the following order:', '', '*ORDER DETAILS*'];
    pricedItems(items).forEach(item => {
      const design = config.designs.find(d => d.id === item.id);
      lines.push(`${design.name} × ${item.quantity}`, `Applied price per mask: ${unitRate(items)} | Item total: ${money(item.total)}`, '');
    });
    lines.push('*ORDER SUMMARY*', `Total masks: ${price.quantity}`, `Subtotal before bundle savings: ${money(price.subtotal)}`,
      `Bundle savings: ${price.needsQuote ? 'To confirm (order above 3 masks)' : money(price.savings)}`,
      `Merchandise total: ${price.needsQuote ? 'Please quote this order' : money(price.total)}`,
      `Delivery fee: ${money(price.delivery)}`, `Order total: ${money(price.grandTotal)}`, '', '*CUSTOMER DETAILS*',
      `Name: ${customer.name.trim()}`, `Phone: ${customer.phone.trim()}`, `City / area: ${customer.area.trim()}`, `Delivery address: ${customer.address.trim()}`);
    if (customer.email?.trim()) lines.push(`Email: ${customer.email.trim()}`);
    lines.push('Payment: Cash on delivery (unpaid)');
    if (customer.building?.trim()) lines.push(`Building / apartment: ${customer.building.trim()}`);
    if (customer.notes?.trim()) lines.push(`Notes: ${customer.notes.trim()}`);
    lines.push('', 'Please confirm availability and delivery. Thank you!');
    return lines.join('\n');
  }
  const api = { pricedItems, unitRate, money, sanitizeCart, priceCart, buildMessage };
  root.MasklabCommerce = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
