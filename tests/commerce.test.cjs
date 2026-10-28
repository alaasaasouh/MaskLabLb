const assert = require('node:assert/strict');
const { sanitizeCart, priceCart, buildMessage } = require('../js/commerce.js');
const config = require('../js/products.js');
assert.equal(config.designs.length, 11);
assert.equal(new Set(config.designs.map(d => d.id)).size, 11);
assert.deepEqual(priceCart([]), { quantity: 0, subtotal: 0, total: 0, delivery: 0, grandTotal: 0, savings: 0, needsQuote: false });
for (const [quantity, total, savings] of [[1,1900,0],[2,3500,300],[3,4900,800]]) {
  const price = priceCart([{ id: 'clowbreaker', quantity }]);
  assert.equal(price.total, total); assert.equal(price.delivery, 400); assert.equal(price.grandTotal, total + 400); assert.equal(price.savings, savings);
}
const mixed = [{ id: 'clowbreaker', quantity: 1 }, { id: 'bark-vader', quantity: 2 }];
assert.equal(priceCart(mixed).total, 4900);
for (const [quantity, total] of [[4,6533],[5,8167],[6,9800],[7,11433],[99,161700]]) {
  const price = priceCart([{ id: 'clowbreaker', quantity }]);
  assert.equal(price.delivery, 0); assert.equal(price.grandTotal, total); assert.equal(price.total, total); assert.equal(price.needsQuote, false); assert.equal(price.savings, quantity * 1900 - total); assert.equal(price.subtotal, quantity * 1900);
}
assert.deepEqual(sanitizeCart([{ id: 'unknown', quantity: 1 }, { id: 'bark-vader', quantity: -1 }, null, { id:'bark-vader', quantity: 1.2 }]), []);
assert.deepEqual(sanitizeCart([{ id:'bark-vader', quantity: 2 }, { id:'bark-vader', quantity: 200 }]), [{ id:'bark-vader', quantity:99 }]);
const customer = {name:'Zoë & Karim',phone:'+961 76 123 456',area:'Beirut',address:'Main street #5',building:'2nd floor',notes:'Call before arrival / شكراً'};
const message = buildMessage(mixed, customer);
for (const value of ['Clowbreaker × 1','Bark Vader × 2','Subtotal before bundle savings: $57.00','Bundle savings: $8.00','Merchandise total: $49.00','Delivery fee: $4.00','Order total: $53.00',customer.name,customer.notes]) assert.ok(message.includes(value), value);
assert.equal(decodeURIComponent(encodeURIComponent(message)), message);
assert.ok(buildMessage([{id:'bark-vader',quantity:4}],customer).includes('Merchandise total: $65.33'));
assert.throws(() => buildMessage([],customer));
console.log('PASS: 11 unique designs; empty, 1–3, mixed and >3 pricing; malformed carts; Unicode WhatsApp message.');

const { pricedItems, unitRate } = require('../js/commerce.js');
for (let quantity = 1; quantity <= 20; quantity++) {
  const cart = [{id:'clowbreaker',quantity:1},{id:'bark-vader',quantity:quantity-1}];
  assert.equal(pricedItems(cart).reduce((sum,item)=>sum+item.total,0),priceCart(cart).total);
}
assert.equal(unitRate(mixed), '$16.333 approx.');
assert.equal(unitRate([{id:'clowbreaker',quantity:2}]), '$17.50');
assert.ok(buildMessage(mixed,customer).includes('Applied price per mask: $16.333 approx.'));

// Delivery threshold is strict and uses merchandise after bundle savings.
const originalBundle = config.pricing.bundles[3];
for (const [total, delivery] of [[6499,400],[6500,400],[6501,0]]) {
  config.pricing.bundles[3] = total;
  assert.equal(priceCart([{id:"bark-vader",quantity:3}]).delivery, delivery);
}
config.pricing.bundles[3] = originalBundle;
