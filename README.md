# MASKLAB storefront

Custom responsive storefront in HTML, CSS and vanilla JavaScript. The catalog uses no framework. Direct cash-on-delivery orders use a Vercel function and Brevo; WhatsApp ordering remains browser-only.

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
- Delivery is $4 (`pricing.deliveryFee: 400`), waived when the merchandise total after bundle savings is above $65 (`pricing.freeDeliveryAbove: 6500`). It is included in cart, checkout, and WhatsApp order totals.
- The confirmed offers are 1/$19, 2/$35, 3/$49, including mixed designs.
- Orders of three or more use the exact $49 / 3 per-mask rate ($16.333333...), rounding the final merchandise total to cents. Four masks cost $65.33; five cost $81.67; six cost $98.00.
- Add approved text to `details.sizing`, `care`, `delivery`, `payment`, `returns`, `privacy`, and `terms`. Leave missing values `null` to retain contact-to-confirm information.

The announcement, collection toolbar, product prices, bundles, savings, cart and WhatsApp messages all use this configuration.

## Checkout and privacy

Checkout offers Order on WhatsApp or Place order. WhatsApp opens a prepared message and retains the bag. Place order submits to the Vercel function, which recalculates prices and requests separate customer and merchant emails through Brevo. Payment is cash on delivery. The bag clears only after the service accepts the email batch. Availability and delivery still need merchant confirmation.

Only design IDs and quantities are stored in localStorage. A random retry identifier and timestamp are saved in sessionStorage. Customer details stay in page memory until submission, then go to the order service and Brevo for direct orders, or into the prepared WhatsApp URL. The browser does not store those details. Emails and provider logs retain order details; there is no separate order database or inventory system. Fonts are served locally.

## Deployment

Upload only `index.html`, `style.css`, `js/`, and `assets/` to the document root of client-owned static hosting. The local `.local/releases/MASKLAB-site.zip` handover contains those deployable files. Conventional static hosts and GitHub Pages are compatible; publish only these storefront files, rather than the whole repository. Keep tests, instructions, original source assets and internal handover documents out of the public website.

Source repository: https://github.com/alaasaasouh/MaskLabLb. The main branch is connected to Vercel at https://masklablb.vercel.app and GitHub Pages. Vercel builds only storefront files into public/ and deploys api/order.js separately. GitHub Pages uses the Vercel endpoint for direct orders. Before launch, confirm merchant policies, delivery, sizing, care, product claims and product availability. Add the real canonical site URL and change `og:image` to an absolute URL under that domain for reliable social previews. The project owner's detailed handover remains local in `.local/HANDOVER.md`.

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

## Direct order email setup

1. Create a free Brevo account and verify a sender named MASKLAB under Settings > Senders, Domains & Dedicated IPs > Senders.
2. Create a regular API key under Settings > SMTP & API > API Keys & MCP. Do not use an SMTP key or convert it to an MCP key.
3. In the Vercel project Settings > Environment Variables, add these for Production:
   - BREVO_API_KEY: the private Brevo API key.
   - ORDER_FROM_EMAIL: the exact verified sender email.
   - ORDER_TO_EMAIL: the merchant inbox; defaults to the existing address in js/products.js if omitted.
   - ORDER_ALLOWED_ORIGINS: optional override, comma-separated exact origins. Defaults to https://masklablb.vercel.app,https://alaasaasouh.github.io.
4. Redeploy after saving environment variables. Never commit keys or paste them into browser JavaScript.
5. Place a clearly labelled test order using your own customer email. Confirm that both emails arrive and inspect Brevo transactional logs if delivery fails.

Brevo free usage is currently 300 emails/day, approximately 150 two-email orders. A free Gmail sender can be verified, but Brevo rewrites the sending domain; use a custom authenticated domain when available. Live sending remains unverified until account activation, sender verification and credentials are complete. API acceptance is not a guarantee of inbox delivery.

The endpoint validates details and product quantities, computes all prices server-side, rejects unapproved origins, and has basic per-instance throttling and a honeypot. Configure hosting firewall controls for public traffic; per-instance throttling is not a global rate limit. Brevo handles duplicate email batches using a payload-bound UUID. Retries are accepted for ten minutes, within Brevo's documented deduplication window. After an ambiguous or expired attempt, check email/contact Masklab before placing a new order. Order confirmations contain a reference, items, delivery address, prices and unpaid COD status.

For local API testing, copy .env.example to ignored .env, fill it privately, and run node --env-file=.env preview.cjs on Node 22 or later. Do not use live credentials for automated tests.

Additional checks:

- node tests/orders.test.cjs ? validation, pricing, email recipients, duplicate retries and provider failures using a fake provider.
- node tests/browser-qa.cjs ? desktop/mobile checkout, email validation, failed submission, double clicks and confirmation using a fake provider; no real emails are sent.
- node scripts/build-static.cjs ? build the public storefront allowlist for Vercel.

References: [Brevo API keys](https://help.brevo.com/hc/en-us/articles/209467485-Create-and-manage-your-API-keys), [Brevo email API](https://developers.brevo.com/reference/send-transac-email), [batch idempotency](https://developers.brevo.com/docs/heterogenous-versions-batch-emails).
