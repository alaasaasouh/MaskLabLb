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
- Edit `designs[].name` for display names. Keep `id` stable to preserve saved carts. Set `available: false` to show a design as currently unavailable, disable ordering, remove it from saved bags and reject it in direct orders. Bark Vader is currently unavailable.
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

## Umami order-value tracking

The existing Cloud tracker in `index.html` uses website ID `28388b77-4acf-432e-a7c8-64df7734cca9`. Its deferred script is in the head as recommended by [Umami's installation guide](https://docs.umami.is/docs/collect-data). No new credentials, dependencies, database, Vercel environment variables or deployment configuration are required. Confirm that this ID matches the intended website in your Umami account and that any tracker domain restrictions include `www.leblab.store` and `leblab.store`.

`js/analytics.js` exposes two narrow functions used by the existing checkout in `js/main.js`:

- After a validated successful `/api/order` response, `order-completed` sends `{ revenue: result.grandTotal / 100, currency: 'USD' }`. The amount comes from the server's integer-cent total, including delivery and bundle savings. The two Brevo email versions represent one order and generate one event. This is placed cash-on-delivery order value, not money collected, guaranteed email delivery, fulfilled sales or profit. Cancellations and refunds do not automatically adjust analytics.
- After validated WhatsApp checkout opens the prepared message, `whatsapp-checkout` sends `{ cart_value: priceCart(cart).grandTotal / 100, currency: 'USD' }`. It never includes `revenue`, does not count as a purchase, and does not imply the message was sent. Repeated validated attempts may produce repeated attempt events. General contact links and the fallback message link do not generate additional checkout events.

Only these numeric amounts and currency are supplied as custom event data. No customer details, credentials, WhatsApp URLs, order IDs or custom customer identity are sent. Umami still collects its standard page/session metadata. The checkout never puts contact details in the page URL.

The client claims each accepted order reference in localStorage before attempting tracking, with an in-memory fallback if storage is unavailable. This suppresses repeat backend success responses in the same browser, including reloads and ordinary retries. A slow tracker gets up to 30 seconds to load without delaying checkout. Analytics errors are swallowed and ambiguous network responses are not retried.

This is best-effort, at-most-once tracking per browser, not an exactly-once transaction. Ad blockers, closed pages, storage loss, simultaneous tabs, another browser or network failures can cause missing events or defeat deduplication. Claiming before sending deliberately favors missing revenue over duplicate revenue. No events are replayed after reload. There is no order database or durable analytics outbox, so guaranteed delivery and deduplication across clients would require a larger server-side design. Brevo emails remain the operational order record.

Umami's [Revenue documentation](https://docs.umami.is/docs/revenue) requires the `revenue` and `currency` properties; no special purchase event name is required. Select this website, USD and the intended date range in the Revenue insight. The current [revenue query](https://github.com/umami-software/umami/blob/master/src/queries/sql/revenue/getRevenueStats.ts) and [metrics bar](https://github.com/umami-software/umami/blob/master/src/app/%28main%29/websites/%5BwebsiteId%5D/%28reports%29/revenue/RevenueMetricsBar.tsx) define:

| Metric | Meaning within the selected period and filters |
| --- | --- |
| Total | Sum of tracked revenue amounts in the chosen currency |
| AOV | Total divided by the number of revenue events (Orders) |
| ARPU | Total divided by all matching tracked sessions, including those without purchases |
| Orders | Distinct revenue event IDs; Umami does not deduplicate by our order reference |
| Unique Customers | Distinct Umami sessions with revenue events; not a count of verified people |

Umami's anonymous session identification can group or split actual people. See [metric definitions](https://docs.umami.is/docs/metric-definitions). We do not send an email, phone number or other identity to improve that estimate. These five metrics are calculated by Umami, not stored as custom counters on this website.

Run `node tests/analytics.test.cjs` and `node tests/browser-qa.cjs` for safe verification. The first checks a $50 event, separate orders, retries/reloads, tracker delays/failures and blocked storage. Browser QA mocks Umami and Brevo, blocks the real analytics script, and checks failed checkout, double clicks, the server's $81.67 total, separate WhatsApp events and two email recipients. It sends no real orders, emails or analytics. Current store prices remain unchanged; $50 is a mock test value.

To verify the real dashboard after deployment, coordinate one clearly marked test with the owner: use your own details and email, add one available $19 mask, enter `TEST ORDER - DO NOT FULFILL` in the note, and click Place order once. The current total is $23 including delivery. This intentionally sends real confirmation emails and records $23 of test order value, but no online payment is taken. Ask the owner to cancel the test rather than fulfill it. In browser Network tools, check for one Umami collection request with `order-completed`, `revenue: 23` and `currency: 'USD'`. In Umami, choose this website, USD and a narrow current time range, then refresh the Revenue insight: Orders should increase by one and Total by $23; AOV and ARPU depend on the other events/sessions in the filter. Verify both emails separately. Keep a record of the test value when reconciling reports. For a clean isolated test, use a separate Umami test website in a local/staging copy and a mocked email provider; do not change production prices or publish test credentials. Live Cloud ingestion and Vercel deployment are not verified by the local mocks.

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
   - ORDER_ALLOWED_ORIGINS: optional additional store origins, comma-separated. Official https://www.leblab.store and https://leblab.store addresses, plus the Vercel and GitHub Pages origins, remain enabled. Vercel-provided VERCEL_PROJECT_PRODUCTION_URL and VERCEL_URL are also accepted; custom domains must be included here if not supplied by those variables. URLs are normalized to their origin.
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

## Meta Pixel audit and configuration

The storefront uses HTML, CSS and vanilla JavaScript, not Next.js/React. Vercel runs `node scripts/build-static.cjs` and serves `public/`, with a separate order function. Existing analytics are Umami (pageviews plus custom `order-completed` and `whatsapp-checkout` events); Umami's website UUID is not a Meta Pixel ID. Previously there was no Meta script, Pixel ID, PageView, consent integration, or duplicate Meta initialization in the source. Public HTML checks on 4 November 2026 returned HTTP 200 for both `https://www.leblab.store` and `https://masklablb.vercel.app`, showing the existing local scripts plus Umami and no Meta snippet. Neither returned CSP or CSP Report-Only headers. No CSP is configured in `index.html` or `vercel.json`. Vercel dashboard variables, Meta dataset settings, automatic advanced matching and Event Setup Tool rules could not be inspected from this environment.

The owner-supplied test Pixel ID is **`1278605057782743`**, configured in `js/meta-config.js`. Both source previews (including Live Server on port 5500) and Vercel builds use this default. To replace it with the client's Pixel:

1. In Meta Events Manager, select the intended dataset/pixel and copy its numeric Pixel ID from Settings. Do not use an ad-account ID, access token or the Umami UUID.
2. In the existing Vercel project, open **Settings > Environment Variables**, add **`META_PIXEL_ID`** with that ID, and select **Production**. Add Preview/Development only if you want those environments tracked (prefer a separate test dataset).
3. Redeploy after the code is deployed. The build validates and writes only this public ID to `public/js/meta-config.js`; browser JavaScript cannot read Vercel environment variables directly. `NEXT_PUBLIC_`/`VITE_` prefixes are not used by this build. An unset variable uses the owner-supplied default above; an explicitly empty variable disables Meta; malformed IDs fail the build. No secrets are included. Use an explicit empty variable to disable Meta on Preview/Development if needed.
4. To change the default everywhere, edit `pixelId` in `js/meta-config.js`. To test a build override locally, set the variable in ignored `.env`, run `node --env-file=.env scripts/build-static.cjs`, and serve `public/`. `preview.cjs`/Live Server serve source and therefore use the ID in `js/meta-config.js`.

Vercel deployment: use the existing Git-connected project, with build command `node scripts/build-static.cjs` and output directory `public` (already specified in `vercel.json`). Deploy the approved commit on `main`, wait for the Vercel deployment to become Ready, and verify that the project domain `leblab.store` points to that deployment. If a saved `META_PIXEL_ID` exists, set it to `1278605057782743` for this test; it overrides the source default. Saving a new variable requires a new deployment. Do not add another Pixel through GTM, a Vercel integration or an inline snippet.

Advertising consent defaults to denied. A small branded Accept/Decline control asks first-time visitors whether Meta may track page visits and shopping actions. No Meta script loads and no past actions replay before acceptance. The choice is saved under `masklab-advertising-consent-v1` in browser local storage for the configured Pixel ID; acceptance restores automatically on later page loads. Decline keeps Meta off. Use **Tracking settings** in the footer to accept or revoke at any time; changes synchronize across tabs. A different Pixel ID requires a new choice. If browser storage is blocked, the current visit still works and the next visit asks again. No noscript tracking image bypasses the choice. Existing Umami behavior remains separate. The supplied imagery and storefront layout are preserved; only this tracking control, a footer setting and factual tracking information were added.

The loader initializes once and sends the initial `PageView` after consent. It also observes `history.pushState`, `history.replaceState` and Back/Forward (`popstate`): changed paths/queries send one PageView, repeated URLs and section anchors do not. No earlier navigation is replayed on opt-in. `fbq.disablePushState = true` disables the SDK's overlapping automatic history tracking. The existing storefront only uses section anchors and does not have a client-side router; this support also covers future route changes without altering routing or adding server rewrites. Deep-link routing would need its own implementation if real multi-page routes are introduced.

It refuses to initialize over an existing `fbq`, `_fbq` or Meta loader, so remove any separate manual/GTM installation instead of combining owners. Re-executing the integration script reuses its existing singleton. Events use `trackSingle` for the configured ID. Automatic configuration is disabled in code; also inspect Meta's Event Setup Tool rules/automatic events and advanced matching settings to prevent account-side duplicates or unintended form capture. No customer form details or advanced-matching identifiers are passed by this integration.

| Event | Trigger |
| --- | --- |
| PageView | Initial page after consent, then once per changed path/query, including Back/Forward. Hash section links, repeated URLs and cart rendering do not count as new pages. Sorting currently changes only the DOM and does not fire PageView. |
| ViewContent | Opening a product's quick view or changing the selected design. Quantity-only changes do not count. |
| AddToCart | Successful additions from grid/quick view and actual quantity increases in the bag. Unavailable items, removals and quantity limits do not fire it. Value is the added quantity at the listed price. |
| InitiateCheckout | Opening checkout with a nonempty bag. Value includes actual bundle pricing and delivery. |
| Purchase | Only an authoritative success with `ok: true`, `orderStatus: 'confirmed'`, valid order reference and server-calculated `grandTotal`. Deduplicated by Pixel ID/order ID, with `eventID` for future server-event deduplication. |

The current endpoint confirms email-provider acceptance of an **order request**; it does not confirm availability or payment. Therefore it does not send `orderStatus: 'confirmed'`, and **Purchase intentionally never fires for current COD requests or WhatsApp clicks**. `purchaseConfirmed(result, submittedCart)` is wired at backend success for a future genuine order-confirmation response. Do not mark requests confirmed just to produce purchases. Confirmation after the visitor leaves needs a separate trusted backend/order system integration (for example Conversions API); this repository has no such confirmation source. Browser events can also be blocked or missed; they are not order records.

There is no repository CSP to amend. If the live host/proxy adds one, inspect the document's response headers and browser CSP console errors. Merge `https://connect.facebook.net` into `script-src` (and `script-src-elem` if present), and `https://www.facebook.com` into `connect-src` and `img-src`; retain the site's existing allowances, including Umami. Check CSP Report-Only separately. Do not disable CSP or add broad wildcards to solve a tracking error.

### Verification

Run `node tests/meta-pixel.test.cjs`, `node tests/meta-build.test.cjs`, `node tests/analytics.test.cjs`, `node tests/commerce.test.cjs`, `node tests/orders.test.cjs`, `node tests/browser-qa.cjs` and `node scripts/build-static.cjs`. Browser QA uses a synthetic local Pixel ID, blocks Meta and Umami network traffic, and mocks the email provider. It verifies first-visit choices, saved acceptance/decline, automatic tracking after refresh, UI revocation, navigation/Back, anchor/repeated-URL deduplication, repeated script execution, actual shopping event hooks and no premature Purchase, without polluting live analytics. Build tests verify the configured ID, environment override, explicit disabling and malformed-ID rejection.

After deployment:

1. Open **Meta Events Manager > your dataset/pixel > Test events**, then open the deployed website from the browser-testing section. Use a clean browser profile without an ad blocker, keeping Test events open.
2. Click **Decline**: confirm no `fbevents.js` request or Meta events, including after refresh. Reopen **Tracking settings** in the footer and click **Accept**: expect exactly one PageView. Refresh and verify the choice restores automatically without Console commands. For a diagnostic test in your own browser, you can explicitly opt in from DevTools Console with `MasklabMetaPixel.setConsent(true)` after the page loads; this is a diagnostic API; visitors use the on-page Accept/Decline control. In DevTools Network, confirm `fbevents.js` loads and Meta `/tr` requests carry `id=1278605057782743` (or your configured replacement) and `ev=PageView`; investigate console CSP errors if blocked.
   For a temporary client-side navigation check, run `history.pushState({}, '', '/?pixel-test=1')`, repeat it (no additional PageView), then run `history.back()` (one PageView for returning). Use `history.replaceState({}, '', '/')` to clean up when needed. Clicking homepage section links must not add PageViews. Repeatedly granting consent must not duplicate the initial PageView.
3. Open/change a product, add it, increase its bag quantity, then open checkout: expect ViewContent, AddToCart and InitiateCheckout with correct product IDs, quantities, USD and values. Sort, remove an item and open an empty bag: no spurious commerce events.
4. Prepare WhatsApp, attempt a failed order, and submit a test COD request: expect no Purchase. A future genuinely confirmed test order should produce one Purchase with the server total, and retrying the same confirmation should not produce another. Obtain owner approval before placing real orders or sending real emails.
5. Revoke consent: later actions must stop producing events. Reload and confirm the saved choice is restored; declining must keep the Pixel unloaded. Check Events Manager Diagnostics and use Meta Pixel Helper to investigate duplicate or missing events. Remove overlapping GTM snippets/Event Setup Tool rules if found.

Dashboard reference: [Vercel environment variable management](https://vercel.com/docs/environment-variables/managing-environment-variables). Meta reference: [Pixel implementation](https://developers.facebook.com/docs/meta-pixel/implementation/), [Pixel event reference](https://developers.facebook.com/docs/meta-pixel/reference/), [consent controls](https://developers.facebook.com/docs/meta-pixel/implementation/gdpr/). Meta documentation retrieval was rate-limited during this audit; live Events Manager ingestion remains to be verified with the owner's ID and access.
