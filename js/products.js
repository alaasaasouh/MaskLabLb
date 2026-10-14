/* One balaclava, eleven designs. Edit merchant information here. */
(function (root) {
  const store = {
    name: 'MASKLAB',
    email: 'alaasaasouh8@gmail.com',
    whatsapp: '96176723303',
    instagram: 'https://www.instagram.com/masklab.lb/',
    product: { id: 'masklab-balaclava', name: 'MASKLAB Balaclava', unitPrice: 1900, currency: 'USD' },
    pricing: { bundles: { 1: 1900, 2: 3500, 3: 4900 }, mixedDesigns: true, deliveryFee: 300 },
    // Add only confirmed policies. null displays an honest contact-to-confirm message.
    details: { sizing: null, care: null, delivery: null, payment: null, returns: null, privacy: null, terms: null },
    designs: [
      { id: 'granpa-no-mercy', name: 'Granpa No Mercy' },
      { id: 'the-last-don', name: 'The Last Don' },
      { id: 'clowbreaker', name: 'Clowbreaker' },
      { id: 'fangzilla', name: 'Fangzilla' },
      { id: 'bark-vader', name: 'Bark Vader' },
      { id: 'meowtrix', name: 'Meowtrix' },
      { id: 'frost-reaper', name: 'Frost Reaper' },
      { id: 'ginger-ninja', name: 'Ginger Ninja' },
      { id: 'stripe-reaper', name: 'Stripe Reaper' },
      { id: 'thug-pug', name: 'Thug Pug' },
      { id: 'frosty-fang', name: 'Frosty Fang' },
    ]
  };
  store.designs = store.designs.map(d => ({ ...d, image: `assets/products/${d.id}.webp`, thumbnail: `assets/products/${d.id}-480.webp` }));
  root.MASKLAB = store;
  if (typeof module !== 'undefined') module.exports = store;
})(typeof window !== 'undefined' ? window : globalThis);
