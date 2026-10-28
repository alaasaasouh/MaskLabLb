/* One balaclava, eleven designs. Edit merchant information here. */
(function (root) {
  const store = {
    name: 'MASKLAB',
    email: 'alaasaasouh8@gmail.com',
    whatsapp: '96181374508',
    instagram: 'https://www.instagram.com/masklab.lb/',
    product: { id: 'masklab-balaclava', name: 'MASKLAB Balaclava', unitPrice: 1900, currency: 'USD' },
    // GitHub Pages uses the Vercel function; Vercel and local previews use their own origin.
    orderEndpoint: typeof location !== 'undefined' && location.hostname === 'alaasaasouh.github.io' ? 'https://masklablb.vercel.app/api/order' : '/api/order',
    pricing: { bundles: { 1: 1900, 2: 3500, 3: 4900 }, mixedDesigns: true, deliveryFee: 400, freeDeliveryAbove: 6500 },
    // Add only confirmed policies. null displays an honest contact-to-confirm message.
    details: {
      sizing: 'All Masklab balaclavas are one size.',
      care: 'Care Instructions\nHand wash gently in cold water with mild detergent.\nDo not bleach, wring or tumble dry.\nAir dry flat in the shade.\nDo not iron.\nFollow any care instructions on the product label.',
      delivery: 'We deliver within Lebanon. All orders are payable by cash on delivery, and delivery costs USD 4, with free delivery on orders above USD 65.',
      payment: 'All orders are payable by cash on delivery. Pay the order total in cash when your masks arrive. No online payment is collected.',
      returns: 'We want you to love your new face. If something isn’t right with your Masklab order, here’s how we can help.\n\nPayment & Delivery\nWe deliver within Lebanon. All orders are payable by cash on delivery, and delivery costs USD 4, with free delivery on orders above USD 65.\n\nReturns & Refunds\nAll sales are final. We do not accept returns or offer refunds, except where required by applicable law.\n\nExchanges\nAll Masklab balaclavas are one size. We do not accept exchanges for size, design preferences or changes of mind.\n\nAn exchange is available only if you receive the wrong item due to an error on our part. Please contact us within 4 calendar days of receiving your order.\n\nTo qualify, the item must remain unopened, unused, unworn and unwashed, in its original packaging, with any original tags attached. Please check the design through the packaging before opening it.\n\nHow to Make a Request\nContact us at masklableb@gmail.com or on WhatsApp at +961 81 374 508, providing:\n- Your order number or the name and phone number used for the order;\n- Details of the incorrect item received; and\n- Clear photos of the item and its packaging.\n\nWe will review your request and provide instructions to coordinate the exchange. Please contact us before sending any item back.\n\nReplacement & Delivery Charges\nIf we sent the wrong item, Masklab will cover the necessary collection and replacement delivery charges.\n\nReplacements are subject to stock availability. If the item originally ordered is unavailable, we will contact you to agree on an alternative or provide a refund where required by applicable law.\n\nYour Rights\nThis policy does not limit any mandatory rights under applicable Lebanese consumer protection law, including rights relating to damaged or defective goods. The unopened-packaging condition and the notification period above do not restrict those rights.',
      privacy: null,
      terms: null
    },
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
