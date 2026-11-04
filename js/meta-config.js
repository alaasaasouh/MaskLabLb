// Public configuration. Vercel's build replaces this file in public/js only.
// Owner-supplied test Pixel. Replace here or override META_PIXEL_ID in Vercel.
// Never put access tokens in this file.
(function (root) {
  const config = { pixelId: '1278605057782743' };
  if (typeof module !== 'undefined') module.exports = config;
  else root.MASKLAB_META = config;
})(typeof window !== 'undefined' ? window : globalThis);
