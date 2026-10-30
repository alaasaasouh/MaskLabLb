(() => {
  'use strict';
  const config = window.MASKLAB;
  const { pricedItems, unitRate, money, sanitizeCart, priceCart, buildMessage } = window.MasklabCommerce;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const storageKey = 'masklab-cart-v1';
  let cart = [];
  let quickId = config.designs[0].id;
  let quickQuantity = 1;
  let toastTimer;
  const dialogTriggers = new WeakMap();
  // Promotional copy uses the same price configuration as the cart.
  $('.announcement a').textContent = `2 for ${money(config.pricing.bundles[2])} / 3 for ${money(config.pricing.bundles[3])} ↗`;
  $('.collection-toolbar > p').textContent = `Mix any 2 for ${money(config.pricing.bundles[2])} · any 3 for ${money(config.pricing.bundles[3])}`;
  try { cart = sanitizeCart(JSON.parse(localStorage.getItem(storageKey))); } catch { /* A blocked or old storage entry must never prevent shopping. */ }

  function notify(message) {
    $('#toast').textContent = message;
    $('#toast').classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('#toast').classList.remove('visible'), 3000);
  }
  function openDialog(dialog, trigger = document.activeElement) {
    dialogTriggers.set(dialog, trigger);
    if (!dialog.open) dialog.showModal();
  }
  function closeDialog(dialog) { dialog.close(); }
  $$('dialog').forEach(dialog => {
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      const trigger = dialogTriggers.get(dialog);
      if (trigger?.isConnected && !document.querySelector('dialog[open]')) {
        const parentDialog = trigger.closest('dialog');
        (parentDialog && !parentDialog.open ? $('[data-open-cart]') : trigger).focus({ preventScroll: true });
      }
    });
  });
  document.addEventListener('click', event => {
    const closer = event.target.closest('[data-close]');
    if (closer) closeDialog(closer.closest('dialog'));
  });

  function renderProducts() {
    let designs = [...config.designs];
    if ($('#sort').value === 'az') designs.sort((a, b) => a.name.localeCompare(b.name));
    if ($('#sort').value === 'za') designs.sort((a, b) => b.name.localeCompare(a.name));
    $('#product-grid').innerHTML = designs.map(design => `
      <article class="product-card">
        <button class="product-image" data-quick="${design.id}" aria-label="View ${design.name} balaclava">
          <span class="product-index" aria-hidden="true">ML / ${String(config.designs.indexOf(design) + 1).padStart(2, '0')}</span>
          <img src="${design.thumbnail}" srcset="${design.thumbnail} 480w, ${design.image} 850w" sizes="(max-width: 600px) 45vw, (max-width: 850px) 30vw, 23vw" width="1068" height="1472" alt="${design.name} balaclava, full design" loading="lazy" decoding="async">
          <span class="quick-label">TAKE A CLOSER LOOK ↗</span>
        </button>
        <div class="product-info"><div><h3>${design.name}</h3><p>MASKLAB BALACLAVA</p></div><span class="price">${money(config.product.unitPrice)}</span></div>
        <button class="add-button" data-add="${design.id}" aria-label="Pre-order ${design.name}"><span>PRE-ORDER</span>${icon('bag')}</button>
      </article>`).join('') + `<article class="editorial-tile"><div><p class="eyebrow">11 FACES. ALL YOU.</p><h3>CAN'T<br>PICK<br>JUST ONE?</h3><p>Good. You don't have to.<br>Mix your favorites and save.</p></div><span class="tile-star" aria-hidden="true">✳</span><a class="text-link" href="#bundles">MEET THE BUNDLES ${icon('arrow')}</a></article>`;
  }
  renderProducts();
  $('#sort').addEventListener('change', renderProducts);
  $('#product-grid').addEventListener('click', event => {
    const add = event.target.closest('[data-add]');
    const quick = event.target.closest('[data-quick]');
    if (add) {
      addToCart(add.dataset.add, 1);
      openDialog($('#cart-drawer'), add);
      add.classList.add('added');
      add.querySelector('span').textContent = 'ADDED TO BAG ✓';
      setTimeout(() => { add.classList.remove('added'); add.querySelector('span').textContent = 'PRE-ORDER'; }, 1600);
    }
    if (quick) { quickId = quick.dataset.quick; quickQuantity = 1; renderQuickView(); openDialog($('#quick-view'), quick); }
  });

  function renderQuickView() {
    const design = config.designs.find(d => d.id === quickId);
    $('#quick-content').innerHTML = `<div class="quick-layout"><div class="quick-image"><img src="${design.image}" width="1068" height="1472" alt="${design.name} balaclava"></div><div class="quick-info"><p class="eyebrow">YOUR NEXT PERSONALITY</p><h2 id="quick-title">${design.name}</h2><p class="quick-price">${money(config.product.unitPrice)}</p><p class="quick-subtitle">One MASKLAB balaclava. A whole new attitude. Goggles and other accessories are not included.</p><label class="design-label">CHOOSE YOUR DESIGN<select class="design-select" id="quick-design">${config.designs.map(d => `<option value="${d.id}" ${d.id === quickId ? 'selected' : ''}>${d.name}</option>`).join('')}</select></label><p class="quick-bundle">Mix any 2 for ${money(config.pricing.bundles[2])} · any 3 for ${money(config.pricing.bundles[3])}</p><div class="quick-buy"><div class="quantity-control"><button data-quick-delta="-1" aria-label="Decrease quantity" ${quickQuantity === 1 ? 'disabled' : ''}>−</button><output id="quick-quantity" aria-live="polite">${quickQuantity}</output><button data-quick-delta="1" aria-label="Increase quantity" ${quickQuantity === 99 ? 'disabled' : ''}>+</button></div><button class="button button-blue" id="quick-add">PRE-ORDER ${icon('bag')}</button></div><details><summary>Sizing & care</summary><p id="quick-care"></p></details><details><summary>Delivery & ordering</summary><p>Pre-order on WhatsApp or place your pre-order here with cash on delivery. Delivery is ${money(config.pricing.deliveryFee)}, with free delivery on orders above ${money(config.pricing.freeDeliveryAbove)}. Any delivery fee is included in your order total. Availability and delivery are confirmed by Masklab.</p></details></div></div>`;
    $('#quick-care').textContent = [config.details.sizing || 'Sizing information will be available soon.', config.details.care || 'Care instructions will be available soon.'].join('\n\n');
  }
  $('#quick-content').addEventListener('change', event => {
    if (event.target.id === 'quick-design') { quickId = event.target.value; renderQuickView(); $('#quick-design').focus(); }
  });
  $('#quick-content').addEventListener('click', event => {
    const control = event.target.closest('[data-quick-delta]');
    if (control) {
      quickQuantity = Math.min(99, Math.max(1, quickQuantity + Number(control.dataset.quickDelta)));
      $('#quick-quantity').textContent = quickQuantity;
      $('[data-quick-delta="-1"]').disabled = quickQuantity === 1;
      $('[data-quick-delta="1"]').disabled = quickQuantity === 99;
    }
    if (event.target.closest('#quick-add')) {
      addToCart(quickId, quickQuantity);
      closeDialog($('#quick-view'));
      openDialog($('#cart-drawer'));
    }
  });

  function persistCart() {
    cart = sanitizeCart(cart);
    try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch { notify('Your bag works, but this browser cannot save it after closing.'); }
    renderCart();
    $('#whatsapp-fallback').hidden = true;
    $('#whatsapp-link').removeAttribute('href');
  }
  function addToCart(id, quantity) {
    const design = config.designs.find(d => d.id === id);
    if (!design) return;
    const existing = cart.find(item => item.id === id);
    const before = existing?.quantity || 0;
    if (existing) existing.quantity = Math.min(99, before + quantity);
    else cart.push({ id, quantity: Math.min(99, quantity) });
    persistCart();
    const added = Math.min(99, before + quantity) - before;
    notify(added ? `${design.name} added to your bag${added > 1 ? ` × ${added}` : ''}.` : 'Maximum 99 of each design. Contact Masklab for larger orders.');
  }
  function summaryMarkup(price) {
    const freeDelivery = price.quantity > 0 && price.total > config.pricing.freeDeliveryAbove;
    const deliveryMarkup = freeDelivery
      ? `<span class="delivery-price"><del><span class="sr-only">Original delivery fee: </span>${money(config.pricing.deliveryFee)}</del><strong>FREE<span class="sr-only">, ${money(price.delivery)}</span></strong></span>`
      : `<span>${money(price.delivery)}</span>`;
    const deliveryNote = freeDelivery
      ? `Free delivery unlocked! Your merchandise total is above ${money(config.pricing.freeDeliveryAbove)}.`
      : `Free delivery on orders above ${money(config.pricing.freeDeliveryAbove)} after bundle savings. Applied automatically.`;
    return `<div class="summary-row"><span>Subtotal (${price.quantity} ${price.quantity === 1 ? 'mask' : 'masks'})</span><span>${money(price.subtotal)}</span></div><div class="summary-row savings"><span>Bundle savings</span><span>&minus;${money(price.savings)}</span></div><div class="summary-row"><span>Merchandise total</span><span>${money(price.total)}</span></div><div class="summary-row${freeDelivery ? ' delivery-free' : ''}"><span>Delivery</span>${deliveryMarkup}</div><p class="delivery-offer${freeDelivery ? ' unlocked' : ''}">${deliveryNote}</p><div class="summary-row total"><span>Order total</span><span>${money(price.grandTotal)}</span></div>`;
  }
  function renderCart() {
    const price = priceCart(cart);
    $$('.cart-count').forEach(el => { el.textContent = price.quantity; });
    $('[data-open-cart]').setAttribute('aria-label', `Open shopping bag, ${price.quantity} items`);
    $('#drawer-count').textContent = `(${price.quantity})`;
    if (!cart.length) {
      $('#cart-body').innerHTML = `<div class="empty-cart">${icon('bag')}<h3>NO FACE IN THE BAG. YET.</h3><p>Your other personality is waiting. Find a design that feels like you.</p><button class="button button-blue" data-continue>FIND YOUR FACE ${icon('arrow')}</button></div>`;
      $('#cart-summary').hidden = true;
      return;
    }
    $('#cart-summary').hidden = false;
    $('#cart-body').innerHTML = pricedItems(cart).map(item => {
      const design = config.designs.find(d => d.id === item.id);
      return `<article class="cart-item" data-cart-id="${item.id}"><img src="${design.thumbnail}" alt="${design.name}" width="78" height="107"><div><div class="cart-item-top"><h3>${design.name}</h3><button class="remove-item" data-remove="${item.id}" aria-label="Remove ${design.name}">Remove</button></div><p class="cart-item-price">${unitRate(cart)} / mask</p><div class="cart-item-bottom"><div class="quantity-control"><button data-delta="-1" data-id="${item.id}" aria-label="Decrease ${design.name} quantity">−</button><output aria-label="${design.name} quantity">${item.quantity}</output><button data-delta="1" data-id="${item.id}" aria-label="Increase ${design.name} quantity" ${item.quantity === 99 ? 'disabled' : ''}>+</button></div><div><span class="line-price">${money(item.total)}</span><span class="line-label">${price.quantity > 1 ? "bundle price applied" : "item total"}</span></div></div></div></article>`;
    }).join('');
    const progress = price.quantity === 1 ? `Add another face to get 2 for ${money(config.pricing.bundles[2])}.` : price.quantity === 2 ? `One more personality? Get 3 for ${money(config.pricing.bundles[3])}.` : `Your ${price.quantity}-mask bundle saves you ${money(price.savings)}.`;
    $('#cart-summary').innerHTML = `<p class="bundle-progress">${progress}</p>${summaryMarkup(price)}<button class="button button-blue cart-checkout" id="start-checkout">${price.needsQuote ? 'REQUEST QUOTE VIA WHATSAPP' : 'CHECKOUT'} ${icon('arrow')}</button><button class="continue-shopping" data-continue>Continue shopping</button>`;
  }
  renderCart();
  $('[data-open-cart]').addEventListener('click', event => openDialog($('#cart-drawer'), event.currentTarget));
  $('#cart-drawer').addEventListener('click', event => {
    const change = event.target.closest('[data-delta]');
    const remove = event.target.closest('[data-remove]');
    if (change) {
      const id = change.dataset.id;
      const delta = change.dataset.delta;
      const item = cart.find(row => row.id === id);
      if (item) item.quantity += Number(delta);
      persistCart();
      const next = $(`[data-id="${id}"][data-delta="${delta}"]:not(:disabled)`) || $('.cart-drawer [data-close]');
      next.focus({ preventScroll: true });
    }
    if (remove) {
      const name = config.designs.find(d => d.id === remove.dataset.remove).name;
      cart = cart.filter(item => item.id !== remove.dataset.remove);
      persistCart();
      $('.cart-drawer [data-close]').focus({ preventScroll: true });
      notify(`${name} removed from your bag.`);
    }
    if (event.target.closest('[data-continue]')) { closeDialog($('#cart-drawer')); $('#shop').scrollIntoView(); }
    if (event.target.closest('#start-checkout')) {
      if (!cart.length) return;
      $('#checkout-form').hidden = false;
      $('#order-success').hidden = true;
      $('#order-status').hidden = true;
      $('#checkout-review').innerHTML = `<p class="review-items">${pricedItems(cart).map(item => `${config.designs.find(d => d.id === item.id).name} × ${item.quantity} &mdash; ${money(item.total)}`).join('<br>')}</p>${summaryMarkup(priceCart(cart))}`;
      closeDialog($('#cart-drawer'));
      openDialog($('#checkout-dialog'));
    }
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey) return;
    try { cart = sanitizeCart(JSON.parse(event.newValue)); } catch { cart = []; }
    renderCart();
    if ($('#checkout-dialog').open) {
      closeDialog($('#checkout-dialog'));
      openDialog($('#cart-drawer'));
      notify('Your bag changed in another tab. Please review it before checkout.');
    }
    $('#whatsapp-fallback').hidden = true;
    $('#whatsapp-link').removeAttribute('href');
  });

  const form = $('#checkout-form');
  let submitting = false;
  let orderAttempt;
  try { orderAttempt = JSON.parse(sessionStorage.getItem('masklab-order-attempt')); } catch { /* Optional retry storage. */ }
  form.addEventListener('click', event => {
    if (event.target.closest('[value="whatsapp"]')) form.elements.email.setCustomValidity('');
  });
  form.addEventListener('input', event => {
    if (event.target.setCustomValidity) event.target.setCustomValidity('');
    $('#whatsapp-fallback').hidden = true;
    $('#whatsapp-link').removeAttribute('href');
    $('#order-status').hidden = true;
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting) return;
    if (!cart.length) { notify('Add a mask before checking out.'); closeDialog($('#checkout-dialog')); return; }
    const directOrder = event.submitter?.value === 'order';
    const customer = Object.fromEntries(new FormData(form));
    for (const name of ['name', 'phone', 'area', 'address']) {
      if (!customer[name].trim()) form.elements[name].setCustomValidity('Please fill in this field.');
    }
    form.elements.email.setCustomValidity(directOrder && !customer.email.trim() ? 'Enter your email address to receive your order confirmation.' : '');
    const phone = customer.phone.replace(/[\s().-]/g, '');
    const validPhone = /^(?:\+961|00961)(?:0?[1-9]\d{6,7})$/.test(phone) || /^0?\d{7,8}$/.test(phone) || /^\+[1-9]\d{7,14}$/.test(phone);
    if (!validPhone) form.elements.phone.setCustomValidity('Enter a Lebanese phone number or an international number with + country code.');
    if (!form.reportValidity()) return;
    $('#whatsapp-fallback').hidden = true;
    if (!directOrder) {
      const url = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent(buildMessage(cart, customer))}`;
      $('#whatsapp-link').href = url;
      $('#whatsapp-fallback').hidden = false;
      window.open(url, '_blank', 'noopener,noreferrer');
      return;
    }
    submitting = true;
    $('#checkout-fields').disabled = true;
    form.setAttribute('aria-busy', 'true');
    const status = $('#order-status');
    status.hidden = false;
    status.textContent = 'Placing your order…';
    status.classList.remove('order-error');
    const submittedCart = cart.map(item => ({...item}));
    try {
      if (!orderAttempt?.requestId) {
        orderAttempt = {requestId: crypto.randomUUID(), startedAt: Date.now()};
        try { sessionStorage.setItem('masklab-order-attempt', JSON.stringify(orderAttempt)); } catch { /* In-memory retries still work. */ }
      }
      const response = await fetch(config.orderEndpoint, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...orderAttempt, cart: submittedCart, customer, payment:'cod', website: customer.website}),
        signal: AbortSignal.timeout(20000)
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.ok || !/^ML-[A-F0-9]{16}$/.test(result.orderId || '') || !Number.isSafeInteger(result.grandTotal)) {
        if ([403,404,405,413,415,503].includes(response.status)) {
          orderAttempt = undefined;
          try { sessionStorage.removeItem('masklab-order-attempt'); } catch { /* Optional storage. */ }
        }
        throw new Error(result?.error || 'Online ordering is not available right now. Please order on WhatsApp.');
      }
      // Remove only the submitted quantities, preserving anything added in another tab.
      cart = cart.map(item => ({...item, quantity: item.quantity - (submittedCart.find(row => row.id === item.id)?.quantity || 0)}));
      persistCart();
      orderAttempt = undefined;
      try { sessionStorage.removeItem('masklab-order-attempt'); } catch { /* Optional storage. */ }
      form.reset();
      form.hidden = true;
      $('#order-confirmation').textContent = `Order ${result.orderId}. Total due on delivery: ${money(result.grandTotal)}. A confirmation email has been requested for ${customer.email.trim()}. Check your inbox and spam folder.`;
      $('#order-success').hidden = false;
      if ($('#checkout-dialog').open) $('#order-success').focus();
    } catch (error) {
      status.textContent = error.name === 'TimeoutError' || error instanceof TypeError
        ? 'We could not confirm your order. Retry with the same details, or check with Masklab before placing another order.'
        : error.message;
      status.classList.add('order-error');
      status.focus();
    } finally {
      submitting = false;
      $('#checkout-fields').disabled = false;
      form.removeAttribute('aria-busy');
    }
  });

  $('#bundle-grid').innerHTML = [1, 2, 3].map(quantity => {
    const total = config.pricing.bundles[quantity];
    const original = config.product.unitPrice * quantity;
    return `<article class="bundle-card ${quantity === 3 ? 'featured' : ''}">${quantity === 3 ? '<span class="bundle-ribbon">BEST VALUE</span>' : ''}<p class="bundle-label">${['THE SOLO PERSONALITY', 'THE DOUBLE TAKE', 'THE WHOLE MOOD'][quantity - 1]}</p><h3>${quantity} ${quantity === 1 ? 'MASK' : 'MASKS'}</h3><p class="bundle-price"><sup>$</sup>${total / 100}${quantity > 1 ? `<del>${money(original)}</del>` : ''}</p><p class="bundle-savings">${quantity > 1 ? `SAVE ${money(original - total)} · MIX ANY DESIGNS` : 'ONE FACE. ALL THE ATTITUDE.'}</p><a class="button ${quantity === 3 ? 'button-blue' : 'button-outline'}" href="#shop">CHOOSE YOUR${quantity === 1 ? ' FACE' : 'S'} ${icon('arrow')}</a></article>`;
  }).join('');

  const policies = {
    delivery: { title: 'Delivery information', copy: config.details.delivery || `Delivery is ${money(config.pricing.deliveryFee)}, with free delivery on orders above ${money(config.pricing.freeDeliveryAbove)}. Any delivery fee is included in your order total. Enter your city and full delivery address at checkout. Coverage and timing details will be added once available.` },
    returns: { title: 'Return & Exchange Policy', copy: config.details.returns || 'Masklab’s returns and exchanges policy will be added here once provided. Please contact the team on WhatsApp to confirm the applicable conditions before ordering, or for help with an item you received.' },
    privacy: { title: 'Privacy information', copy: config.details.privacy || 'Your bag is saved in your browser, along with an order retry identifier for the current tab. Your contact and delivery details are not saved in browser storage. Place order sends those details to our order service and email provider to notify Masklab and send your confirmation. Order details are retained in those emails and provider logs. WhatsApp orders include your details in a message you send yourself. Masklab’s full business privacy statement will be added when supplied.' },
    terms: { title: 'Ordering information', copy: config.details.terms || 'Choose your designs, review your bag, and add your contact and delivery details. Choose Order on WhatsApp to send a prepared message, or Place order to submit here and receive an email confirmation. Payment is cash on delivery. Masklab confirms availability and delivery. Orders of three or more use the same per-mask rate as the three-mask bundle, with the order total rounded to cents. A submitted order request does not guarantee stock availability. Masklab’s full terms of sale will be added once supplied.' }
  };
  const faqs = [
    ['What is a Masklab balaclava?', 'A streetwear balaclava with personality. Choose from 11 expressive animal prints and bold faces—one base product, eleven different designs.'],
    ['Can I mix different designs in a bundle?', `Yes. Mix any two designs for ${money(config.pricing.bundles[2])}, or any three for ${money(config.pricing.bundles[3])}. Savings apply automatically in your bag. For three or more masks, the $49 / 3 per-mask rate applies automatically; the order total is rounded to cents.`],
    ['How do I place an order?', 'Add your favorite faces to the bag and enter your delivery details. Choose Order on WhatsApp and tap Send, or enter your email and choose Place order to submit directly. Pay cash on delivery. Masklab confirms availability and delivery.'],
    ['What about sizing and washing?', [config.details.sizing, config.details.care || 'Care instructions will be available soon.'].filter(Boolean).join('\n\n')],
    ['Where do you deliver, and how much is delivery?', config.details.delivery || `Delivery is ${money(config.pricing.deliveryFee)}, with free delivery on orders above ${money(config.pricing.freeDeliveryAbove)}. Any delivery fee is included in your order total. Coverage and timing details will be added once available.`],
    ['How do payment, returns and exchanges work?', [config.details.payment, config.details.returns].filter(Boolean).join(' ') || 'Please confirm payment arrangements and returns or exchange conditions directly with Masklab on WhatsApp before placing your order. The full policies will be added once provided.']
  ];
  faqs.forEach(([question, answer]) => {
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const paragraph = document.createElement('p');
    summary.textContent = question; paragraph.textContent = answer;
    details.append(summary, paragraph); $('#faq-list').append(details);
  });
  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-policy]');
    if (!trigger) return;
    const policy = policies[trigger.dataset.policy];
    if (!policy) return;
    $('#policy-title').textContent = policy.title;
    $('#policy-content').textContent = policy.copy;
    openDialog($('#policy-dialog'));
  });
  $$('[data-contact]').forEach(link => { link.href = `https://wa.me/${config.whatsapp}?text=${encodeURIComponent('Hi Masklab! I have a question about your balaclavas.')}`; });
  $$('[data-instagram]').forEach(link => { link.href = config.instagram; });
  $('#year').textContent = new Date().getFullYear();

  $('.menu-toggle').addEventListener('click', event => openDialog($('#mobile-menu'), event.currentTarget));
  $$('#mobile-menu nav a').forEach(link => link.addEventListener('click', () => closeDialog($('#mobile-menu'))));
  const updateHeader = () => $('#header').classList.toggle('scrolled', window.scrollY > 55);
  window.addEventListener('scroll', updateHeader, { passive: true }); updateHeader();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('waiting'); revealObserver.unobserve(entry.target); }
    }), { threshold: 0.08 });
    if (!reducedMotion) $$('.reveal').forEach(el => { el.classList.add('waiting'); revealObserver.observe(el); });
    const navigationObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) $$('.desktop-nav a').forEach(link => link.classList.toggle('active', link.hash === `#${entry.target.id}`));
    }), { rootMargin: '-15% 0px -60% 0px' });
    ['home', 'shop', 'fabric', 'about', 'contact'].forEach(id => navigationObserver.observe(document.getElementById(id)));
  }
})();
