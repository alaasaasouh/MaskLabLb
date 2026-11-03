const assert = require('node:assert/strict');
const createAnalytics = require('../js/analytics.js');
const values = new Map();
const events = [];
const browser = {
  localStorage: { getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) },
  umami: { track: (name, data) => events.push({ name, data }) },
  setTimeout: () => { throw Error('Ready tracker should not need a timer'); }
};
const analytics = createAnalytics(browser);
const first = 'ML-0123456789ABCDEF';
const second = 'ML-FEDCBA9876543210';
analytics.orderCompleted(first, 5000);
analytics.orderCompleted(first, 5000); // Double click or replayed backend success.
createAnalytics(browser).orderCompleted(first, 5000); // Page refresh / another tab.
assert.deepEqual(events, [{ name: 'order-completed', data: { revenue: 50, currency: 'USD' } }]);
analytics.orderCompleted(second, 8167);
assert.equal(events.length, 2);
assert.equal(events[1].data.revenue, 81.67);
analytics.whatsappCheckout(5300);
assert.deepEqual(events[2], { name: 'whatsapp-checkout', data: { cart_value: 53, currency: 'USD' } });
assert.ok(!('revenue' in events[2].data));
for (const invalid of [-1, NaN, Infinity, 1.5, '5000']) {
  analytics.orderCompleted('ML-AAAAAAAAAAAAAAAA', invalid);
  analytics.whatsappCheckout(invalid);
}
analytics.orderCompleted('bad-id', 5000);
assert.equal(events.length, 3);
assert.ok(!JSON.stringify(events).includes(first), 'Order references stay local');

// Tracker loading after checkout: wait briefly without delaying success.
const timers = [];
const delayed = { localStorage: browser.localStorage, setTimeout: callback => timers.push(callback) };
const later = createAnalytics(delayed);
later.orderCompleted('ML-BBBBBBBBBBBBBBBB', 2300);
later.orderCompleted('ML-BBBBBBBBBBBBBBBB', 2300);
assert.equal(timers.length, 1);
delayed.umami = browser.umami;
timers.shift()();
assert.equal(events.length, 4);
assert.equal(events[3].data.revenue, 23);

// Blocked storage falls back to memory; tracker exceptions/rejections are isolated.
let calls = 0;
const broken = {
  get localStorage() { throw Error('Storage blocked'); },
  umami: { track() { calls++; throw Error('Tracker failed'); } },
};
const fallback = createAnalytics(broken);
assert.doesNotThrow(() => fallback.orderCompleted(first, 5000));
fallback.orderCompleted(first, 5000);
assert.equal(calls, 1);
broken.umami.track = () => Promise.reject(Error('Network failed'));
assert.doesNotThrow(() => fallback.orderCompleted(second, 5000));

// A permanently unavailable tracker expires without any later replay.
const originalNow = Date.now;
try {
  let now = 0;
  Date.now = () => now;
  const blocked = { localStorage: browser.localStorage, setTimeout: callback => timers.push(callback) };
  createAnalytics(blocked).whatsappCheckout(5000);
  now = 30001;
  blocked.umami = browser.umami;
  timers.shift()();
  assert.equal(events.length, 4);
} finally { Date.now = originalNow; }
console.log('PASS: $50 event; distinct orders; duplicate/reload suppression; cents; WhatsApp separation; delayed/blocked tracker; storage and analytics failures.');
