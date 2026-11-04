/* A visitor's advertising choice is separate from essential shopping storage. */
(() => {
  'use strict';
  const pixel = window.MasklabMetaPixel;
  const banner = document.querySelector('#tracking-consent');
  if (!pixel || !banner) return;
  const key = 'masklab-advertising-consent-v1';
  const pixelId = String(window.MASKLAB_META?.pixelId || '');
  const settings = document.querySelector('[data-tracking-settings]');
  const status = document.querySelector('#tracking-consent-status');
  let current;
  let returnFocus;

  function readChoice(value) {
    try {
      const saved = JSON.parse(value);
      return saved?.pixelId === pixelId && typeof saved.granted === 'boolean' ? saved.granted : undefined;
    } catch { return undefined; }
  }
  function applyChoice(granted) {
    current = granted;
    pixel.setConsent(granted === true);
    banner.hidden = typeof granted === 'boolean';
    status.textContent = granted === true ? 'Advertising tracking is on.' : granted === false ? 'Advertising tracking is off.' : '';
    banner.querySelectorAll('[data-tracking-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(current === (button.dataset.trackingChoice === 'accept')));
    });
  }
  // A new Pixel owner requires a fresh choice; unrelated old consent is ignored.
  let saved;
  try { saved = window.localStorage.getItem(key); } catch { /* Ask each visit when storage is blocked. */ }
  applyChoice(readChoice(saved));
  if (!/^\d{5,20}$/.test(pixelId)) { banner.hidden = true; settings.hidden = true; return; }

  settings.addEventListener('click', () => {
    returnFocus = settings;
    banner.hidden = false;
    banner.querySelector('[data-tracking-choice="decline"]').focus({preventScroll:true});
  });
  banner.addEventListener('click', event => {
    const button = event.target.closest('[data-tracking-choice]');
    if (!button) return;
    const granted = button.dataset.trackingChoice === 'accept';
    try { window.localStorage.setItem(key, JSON.stringify({pixelId,granted})); } catch { /* Current visit still works. */ }
    const restoreFocus = returnFocus || settings;
    applyChoice(granted);
    restoreFocus.focus({preventScroll:true});
    returnFocus = undefined;
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) applyChoice(readChoice(event.newValue));
  });
})();
