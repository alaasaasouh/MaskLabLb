const { createHash } = require('node:crypto');
const config = require('../js/products.js');
const { priceCart, pricedItems, money, unitRate } = require('../js/commerce.js');

const emailPattern = /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function invalid(message) { const error = new Error(message); error.status = 400; throw error; }
function validateOrder(body, now = Date.now()) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) invalid('Check your order details.');
  if (!uuidPattern.test(body.requestId || '')) invalid('Please reopen checkout and try again.');
  if (!Number.isSafeInteger(body.startedAt) || body.startedAt > now + 60000 || now - body.startedAt > 10 * 60 * 1000) {
    invalid('This order attempt has expired. Check your email or contact Masklab before placing it again.');
  }
  if (body.website) invalid('Unable to submit this order. Please contact Masklab.');
  if (body.payment !== 'cod') invalid('Select cash on delivery.');
  if (!Array.isArray(body.cart) || !body.cart.length || body.cart.length > config.designs.length) invalid('Check the masks in your bag.');
  const ids = new Set();
  const cart = body.cart.map(item => {
    if (!item || !config.designs.some(d => d.id === item.id) || ids.has(item.id) || !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99) invalid('Check the masks and quantities in your bag.');
    ids.add(item.id);
    return { id: item.id, quantity: item.quantity };
  });
  const customer = {};
  for (const [key, max] of Object.entries({name:100, email:254, phone:25, area:100, address:400, building:150, notes:600})) {
    const value = body.customer?.[key] ?? '';
    if (typeof value !== 'string' || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) invalid('Check your contact and delivery details.');
    customer[key] = value.trim();
    if (['name','email','phone','area','address'].includes(key) && !customer[key]) invalid('Complete your name, email, phone and delivery address.');
  }
  if (!emailPattern.test(customer.email)) invalid('Enter a valid email address for your confirmation.');
  const phone = customer.phone.replace(/[\s().-]/g, '');
  if (!/^(?:(?:\+961|00961)0?[1-9]\d{6,7}|0?\d{7,8}|\+[1-9]\d{7,14})$/.test(phone)) invalid('Enter a valid phone number.');
  const price = priceCart(cart); // Never accept totals or prices from the browser.
  const digest = createHash('sha256').update(JSON.stringify({requestId:body.requestId, startedAt:body.startedAt, cart, customer, price})).digest('hex');
  // Bind the provider's UUID key to the exact order, including server prices.
  const key = `${digest.slice(0,8)}-${digest.slice(8,12)}-4${digest.slice(13,16)}-8${digest.slice(17,20)}-${digest.slice(20,32)}`;
  return { cart, customer, price, key, orderId: `ML-${digest.slice(0,16).toUpperCase()}` };
}

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
function emailBody(order, merchant = false) {
  const { customer, price, orderId, cart } = order;
  const lines = [merchant ? 'NEW CASH ON DELIVERY ORDER' : 'THANK YOU FOR YOUR ORDER', `Order reference: ${orderId}`, '',
    merchant ? 'Please review availability and arrange delivery with the customer.' : 'Masklab has received your order request. The team will confirm availability and delivery with you.', '',
    ...pricedItems(cart).map(item => `${config.designs.find(d => d.id === item.id).name} x ${item.quantity} — ${money(item.total)}`),
    `Applied price per mask: ${unitRate(cart)}`, '', `Bundle savings: ${money(price.savings)}`, `Merchandise total: ${money(price.total)}`,
    `Delivery: ${money(price.delivery)}`, `Total due on delivery: ${money(price.grandTotal)}`, 'Payment: Cash on delivery (unpaid)', '',
    `Name: ${customer.name}`, `Email: ${customer.email}`, `Phone: ${customer.phone}`, `City / area: ${customer.area}`, `Delivery address: ${customer.address}`];
  if (customer.building) lines.push(`Building / apartment: ${customer.building}`);
  if (customer.notes) lines.push(`Notes: ${customer.notes}`);
  return lines.join('\n');
}
function emailPayload(order, env) {
  return {
    sender: { name: 'MASKLAB', email: env.ORDER_FROM_EMAIL },
    subject: `MASKLAB order ${order.orderId}`,
    htmlContent: '<p>MASKLAB order</p>',
    headers: { idempotencyKey: order.key },
    messageVersions: [
      { to: [{email: order.customer.email, name: order.customer.name}], replyTo: {email: env.ORDER_TO_EMAIL || config.email}, subject: `We received your MASKLAB order ${order.orderId}`, textContent: emailBody(order), htmlContent: `<pre style="font:16px/1.6 Arial,sans-serif;white-space:pre-wrap">${escapeHtml(emailBody(order))}</pre>` },
      { to: [{email: env.ORDER_TO_EMAIL || config.email, name: 'MASKLAB'}], replyTo: {email: order.customer.email}, subject: `New COD order ${order.orderId}`, textContent: emailBody(order, true), htmlContent: `<pre style="font:16px/1.6 Arial,sans-serif;white-space:pre-wrap">${escapeHtml(emailBody(order, true))}</pre>` }
    ]
  };
}

function createOrderHandler({ env = process.env, fetchImpl = fetch, now = Date.now } = {}) {
  const attempts = new Map(); // Basic per-instance throttling; configure hosting firewall as well.
  return async function orderHandler(req, res) {
    const respond = (status, data) => { res.statusCode = status; res.end(JSON.stringify(data)); };
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Vary', 'Origin');
    const allowed = (env.ORDER_ALLOWED_ORIGINS || 'https://masklablb.vercel.app,https://alaasaasouh.github.io').split(',').map(value => value.trim()).filter(Boolean);
    const origin = req.headers.origin;
    if (!origin || !allowed.includes(origin)) return respond(403, {error:'This checkout address is not enabled. Please use the official store or contact Masklab.'});
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { res.statusCode = 204; return res.end(); }
    if (req.method !== 'POST') { res.setHeader('Allow','POST, OPTIONS'); return respond(405,{error:'Use checkout to place your order.'}); }
    if (!env.BREVO_API_KEY || !emailPattern.test(env.ORDER_FROM_EMAIL || '') || !emailPattern.test(env.ORDER_TO_EMAIL || config.email)) return respond(503,{error:'Online ordering is not available yet. Please order on WhatsApp.'});
    if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] || '')) return respond(415,{error:'Invalid order format.'});
    const ip = req.socket?.remoteAddress || 'unknown';
    const timestamp = now();
    for (const [key, value] of attempts) if (timestamp - value.start > 60000) attempts.delete(key);
    const limit = attempts.get(ip) || {start:timestamp, count:0};
    if (++limit.count > 10 || attempts.size > 5000) { res.setHeader('Retry-After','60'); return respond(429,{error:'Please wait a minute before trying again.'}); }
    attempts.set(ip,limit);
    try {
      let body = req.body;
      if (body === undefined) {
        let raw = '';
        for await (const chunk of req) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 16000) return respond(413,{error:'Order details are too long.'}); }
        body = raw;
      }
      if (Buffer.byteLength(typeof body === 'string' ? body : JSON.stringify(body)) > 16000) return respond(413,{error:'Order details are too long.'});
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch { invalid('Invalid order format.'); } }
      const order = validateOrder(body, timestamp);
      const response = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method:'POST', headers:{'api-key':env.BREVO_API_KEY,'Content-Type':'application/json',Accept:'application/json'},
        body:JSON.stringify(emailPayload(order,env)), signal:AbortSignal.timeout(12000)
      });
      const result = await response.json();
      const accepted = response.ok && Array.isArray(result.messageIds) && result.messageIds.length === 2;
      // Brevo rejects a repeated key after accepting the original batch.
      const duplicate = response.status === 400 && result.code === 'duplicate_parameter' && /idempotenc/i.test(result.message || '');
      if (!accepted && !duplicate) return respond(502,{error:'We could not confirm your order. Please retry with the same details, or contact Masklab before ordering again.'});
      return respond(200,{ok:true,orderId:order.orderId,grandTotal:order.price.grandTotal,payment:'cod'});
    } catch (error) {
      return respond(error.status || 502,{error:error.status === 400 ? error.message : 'We could not confirm your order. Please retry with the same details, or contact Masklab before ordering again.'});
    }
  };
}
module.exports = {createOrderHandler, validateOrder, emailPayload};
