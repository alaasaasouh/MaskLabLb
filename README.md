# MASKLAB storefront

Custom responsive storefront in HTML, CSS and vanilla JavaScript. No installation, framework, backend, payment gateway or build step is needed.

## Open the website

Double-click `index.html` in a modern browser. For a local HTTP preview, run:

```powershell
node preview.cjs
```

Then visit http://127.0.0.1:4173. Stop the server with Ctrl+C.

## Files

- `index.html` — homepage, contact links, dialogs and checkout form.
- `style.css` — responsive layouts, fonts, colors and animations.
- `js/products.js` — the base product, 11 designs, prices, contact details and pending merchant information.
- `js/commerce.js` — cart sanitization, integer-cent pricing and WhatsApp message generation.
- `js/main.js` — catalog, quick view, shopping bag, checkout and navigation.
- `assets/` — supplied brand/campaign imagery, optimized products and locally served licensed fonts.
- `tests/` — commerce checks, browser QA and results; do not upload this folder to public hosting.
- `AGENTS.md` — local-edit and push-approval workflow for future development.
- `.local/` — ignored local archive of source assets, screenshots, release ZIP and internal handover notes; never committed.

## Update the store

Edit `js/products.js`:

- Change `whatsapp` using international digits only, without `+` or spaces.
- Change `instagram` to the exact full Instagram URL.
- Edit `designs[].name` for display names. Keep `id` stable to preserve saved carts.
- Replace each design’s `.webp` and `-480.webp` files in `assets/products/`, retaining the full shape and proportions. Original JPEGs are archived locally in `.local/source-assets/products/` and are not part of the repository.
- Prices are integer US cents: `1900` means $19.00. Set `product.unitPrice` and `pricing.bundles` together.
- Delivery is a flat $3 per nonempty order (`pricing.deliveryFee: 300`), added after bundle savings and included in cart, checkout, and WhatsApp order totals.
- The confirmed offers are 1/$19, 2/$35, 3/$49, including mixed designs.
- Orders of three or more use the exact $49 / 3 per-mask rate ($16.333333...), rounding the final merchandise total to cents. Four masks cost $65.33; five cost $81.67; six cost $98.00.
- Add approved text to `details.sizing`, `care`, `delivery`, `payment`, `returns`, `privacy`, and `terms`. Leave missing values `null` to retain contact-to-confirm information.

The announcement, collection toolbar, product prices, bundles, savings, cart and WhatsApp messages all use this configuration.

## Checkout and privacy

The website prepares an encoded WhatsApp message. The customer must tap Send in WhatsApp; Masklab manually confirms the order. The cart is deliberately retained after opening WhatsApp.

Only design IDs and quantities are stored in localStorage. Checkout contact and address fields remain in page memory and are included in the WhatsApp URL only after the user submits. They are not stored in localStorage, sent to analytics, or submitted to a website backend. No tracking tools are included. Fonts are served locally.

## Deployment

Upload only `index.html`, `style.css`, `js/`, and `assets/` to the document root of client-owned static hosting. The local `.local/releases/MASKLAB-site.zip` handover contains those deployable files. Conventional static hosts and GitHub Pages are compatible; publish only these storefront files, rather than the whole repository. Keep tests, instructions, original source assets and internal handover documents out of the public website.

Source repository: https://github.com/alaasaasouh/MaskLabLb. Uploading source does not launch the website. No domain or website hosting account was supplied. Before launch, confirm merchant policies, delivery, sizing, care, product claims and product availability. Add the real canonical site URL and change `og:image` to an absolute URL under that domain for reliable social previews. The project owner's detailed handover remains local in `.local/HANDOVER.md`.

For future changes, edit and verify locally, summarize the result, and ask the owner before pushing to GitHub. An explicit request to push the current changes supplies that approval.

## Verification

```powershell
node tests/commerce.test.cjs
node tests/browser-qa.cjs
```

The optional browser QA script uses an existing Chromium executable (set `MASKLAB_CHROME` to its full path), starts a temporary local server, saves screenshots under `.local/qa/` and stops the processes it starts. It never sends a WhatsApp message. No npm packages are required for these tests.

Browser checks cover mixed-design pricing, cart changes/removal/persistence, invalid checkout input, safe encoded message generation, automatic larger-order pricing, navigation, product switching, focus, image loading and horizontal overflow at 320, 375, 390, 768, 1024 and 1440px. See `tests/qa-result.txt` for the completed run. Real iOS Safari and WhatsApp app handoff still need testing on a device.

## Design and assets

The real logo is presented with a reversible CSS inversion for contrast. Supplied promotional images are cropped through CSS into photographic areas; the source files remain unchanged. All product thumbnails use the actual supplied artwork. Product originals and optimized image variants are kept separately.

Knewave, Barlow Condensed and DM Sans are included under their open font licenses in `assets/fonts/`. The original homepage reference contains example masks that are not catalog items; only the actual 11 product files are purchasable. Goggles are not sold as included accessories.

Your video-to-website skill remains unused, as requested. There are no frame sequences, videos or scroll-scrub dependencies. Native CSS and IntersectionObserver provide reduced-motion-aware animation.

## Email ordering

Checkout offers WhatsApp or email using the same validated customer details and pricing. The email recipient is configured in `js/products.js` as `email`. Email checkout opens a prepared mailto message and provides a copyable order message if no email app is configured. Customers must send the message themselves; no email is sent by the website and no customer details are stored.
