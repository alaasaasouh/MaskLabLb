const assert = require('node:assert/strict');
const createPixel = require('../js/meta-pixel.js');
const shop = require('../js/products.js');
const commerce = require('../js/commerce.js');
const cart = [{id:'clowbreaker',quantity:3}];
function fixture(config = {pixelId:'123456789012345'}) {
  const scripts = [], storage = new Map();
  const browser = {MASKLAB:shop, MasklabCommerce:commerce,
    document:{querySelector:()=>null,createElement:()=>({}),head:{appendChild:s=>scripts.push(s)}},
    localStorage:{getItem:key=>storage.get(key),setItem:(key,value)=>storage.set(key,value)}};
  const pixel = createPixel(browser, config);
  const calls = () => [...(browser.fbq?.queue || [])].map(args=>[...args]);
  const events = () => calls().filter(args=>args[0]==='trackSingle');
  return {browser,pixel,scripts,calls,events};
}
const f = fixture();
f.pixel.viewContent('clowbreaker');
f.pixel.addToCart('clowbreaker',1);
f.pixel.initiateCheckout(cart);
assert.equal(f.scripts.length,0,'No script or events before opt-in');
f.pixel.setConsent(true);
f.pixel.setConsent(true);
assert.equal(f.scripts.length,1);
assert.equal(f.scripts[0].src,'https://connect.facebook.net/en_US/fbevents.js');
assert.equal(f.calls().filter(c=>c[0]==='init').length,1);
assert.deepEqual(f.events().map(c=>c[2]),['PageView'],'Pre-consent actions are not replayed');
assert.deepEqual(f.calls().slice(0,3),[['consent','revoke'],['set','autoConfig',false,'123456789012345'],['init','123456789012345']]);
f.pixel.viewContent('clowbreaker');
f.pixel.addToCart('clowbreaker',2);
f.pixel.addToCart('bark-vader',1);
f.pixel.addToCart('clowbreaker',0);
f.pixel.viewContent('invalid');
f.pixel.initiateCheckout([]);
f.pixel.initiateCheckout(cart);
assert.deepEqual(f.events().map(c=>c[2]),['PageView','ViewContent','AddToCart','InitiateCheckout']);
assert.equal(f.events()[2][3].value,38);
assert.equal(f.events()[3][3].value,53,'Discounts and delivery come from commerce pricing');
const received = {ok:true,orderId:'ML-0123456789ABCDEF',grandTotal:5000,payment:'cod'};
for (const result of [received,{...received,ok:false,orderStatus:'confirmed'},{...received,orderStatus:'pending'}]) f.pixel.purchaseConfirmed(result,cart);
assert.equal(f.events().length,4,'Requests, failures and pending orders are not purchases');
const confirmed = {...received,orderStatus:'confirmed'};
f.pixel.purchaseConfirmed(confirmed,cart);
f.pixel.purchaseConfirmed(confirmed,cart);
assert.equal(f.events().length,5);
assert.equal(f.events()[4][3].value,50,'Only server-confirmed total is used');
assert.deepEqual(f.events()[4][4],{eventID:received.orderId});
f.pixel.setConsent(false);
f.pixel.viewContent('clowbreaker');
f.pixel.purchaseConfirmed({...confirmed,orderId:'ML-AAAAAAAAAAAAAAAA'},cart);
assert.equal(f.events().length,5);
assert.deepEqual(f.calls().at(-1),['consent','revoke']);
f.pixel.setConsent(true);
assert.equal(f.events().filter(c=>c[2]==='PageView').length,1);
// Reload with the same local storage: confirmed purchases stay deduplicated.
const reload = fixture();
reload.browser.localStorage = f.browser.localStorage;
reload.pixel.setConsent(true);
reload.pixel.purchaseConfirmed(confirmed,cart);
assert.equal(reload.events().length,1);
for (const pixelId of ['', 'fake-id', '<script>', '123']) {
  const disabled = fixture({pixelId});
  disabled.pixel.setConsent(true);
  assert.equal(disabled.scripts.length,0);
}
const existing = fixture();
existing.browser.fbq = () => { throw Error('Existing integration must not be called'); };
assert.doesNotThrow(()=>existing.pixel.setConsent(true));
assert.equal(existing.scripts.length,0,'Unknown pixel owners are not initialized twice');
const blocked = fixture();
blocked.browser.document.head.appendChild = () => {throw Error('CSP blocked');};
assert.doesNotThrow(()=>blocked.pixel.setConsent(true));
assert.equal(blocked.events().length,0);
console.log('PASS: consent, single initialization/PageView, product/cart events, confirmed-only Purchase, totals, deduplication, missing/invalid IDs and tracker failures.');
