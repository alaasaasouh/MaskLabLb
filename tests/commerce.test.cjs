const assert = require('node:assert/strict');
const { sanitizeCart, priceCart, buildMessage } = require('../js/commerce.js');
const config = require('../js/products.js');
assert.equal(config.designs.length, 11);
assert.equal(new Set(config.designs.map(d => d.id)).size, 11);
assert.deepEqual(priceCart([]), { quantity: 0, subtotal: 0, total: 0, savings: 0, needsQuote: false });
for (const [quantity, total, savings] of [[1,1900,0],[2,3500,300],[3,4900,800]]) {
  const price = priceCart([{ id: 'clowbreaker', quantity }]);
  assert.equal(price.total, total); assert.equal(price.savings, savings);
}
const mixed = [{ id: 'clowbreaker', quantity: 1 }, { id: 'bark-vader', quantity: 2 }];
assert.equal(priceCart(mixed).total, 4900);
for (const quantity of [4,5,6,99]) {
  const price = priceCart([{ id: 'clowbreaker', quantity }]);
  assert.equal(price.total, null); assert.equal(price.needsQuote, true); assert.equal(price.subtotal, quantity * 1900);
}
assert.deepEqual(sanitizeCart([{ id: 'unknown', quantity: 1 }, { id: 'bark-vader', quantity: -1 }, null, { id:'bark-vader', quantity: 1.2 }]), []);
assert.deepEqual(sanitizeCart([{ id:'bark-vader', quantity: 2 }, { id:'bark-vader', quantity: 200 }]), [{ id:'bark-vader', quantity:99 }]);
const customer = {name:'Zoë & Karim',phone:'+961 76 123 456',area:'Beirut',address:'Main street #5',building:'2nd floor',notes:'Call before arrival / شكراً'};
const message = buildMessage(mixed, customer);
for (const value of ['Clowbreaker × 1','Bark Vader × 2','Subtotal before bundle savings: $57.00','Bundle savings: $8.00','Merchandise total: $49.00',customer.name,customer.notes]) assert.ok(message.includes(value), value);
assert.equal(decodeURIComponent(encodeURIComponent(message)), message);
assert.ok(buildMessage([{id:'bark-vader',quantity:4}],customer).includes('Please quote this order'));
assert.throws(() => buildMessage([],customer));
console.log('PASS: 11 unique designs; empty, 1–3, mixed and >3 pricing; malformed carts; Unicode WhatsApp message.');
