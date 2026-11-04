// Owner-selected automatic tracking. This does not record a visitor consent choice.
// The wrapper remains idempotent and a missing/blank Pixel ID disables Meta.
window.MasklabMetaPixel?.setConsent(true);
