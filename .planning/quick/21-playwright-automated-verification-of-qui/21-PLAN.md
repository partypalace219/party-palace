---
phase: quick-21
plan: 21
type: execute
wave: 1
depends_on: []
files_modified:
  - playwright-verify-q20.js
  - package.json
  - package-lock.json
autonomous: true

must_haves:
  truths:
    - "Playwright is installed and available via `node playwright-verify-q20.js`"
    - "All 11 functional checks for the pickup/delivery fulfillment selector are executed against https://thepartypalace.in"
    - "Each check independently PASSES or FAILS with a descriptive log line"
    - "On any FAIL, a screenshot fail-check-N.png is written and DOM state is dumped"
    - "Script exits non-zero if any check failed, zero if all 11 passed"
    - "No console errors are observed on the live site during the test runs"
  artifacts:
    - path: "playwright-verify-q20.js"
      provides: "Self-contained Playwright test script — 11 checks, fresh incognito context per scenario"
      contains: "const { chromium } = require('playwright')"
    - path: "package.json"
      provides: "@playwright/test as devDependency"
      contains: "@playwright/test"
  key_links:
    - from: "playwright-verify-q20.js"
      to: "https://thepartypalace.in"
      via: "page.goto + fresh context per scenario"
      pattern: "thepartypalace\\.in"
    - from: "Playwright assertions"
      to: "Real DOM selectors in cart.js"
      via: ".cart-fulfillment, .cart-fulfillment-option, .cart-checkout-btn, .cart-total-fee"
      pattern: "cart-fulfillment"
---

<objective>
Verify Quick Task 20's pickup/delivery fulfillment selector works correctly on the live site (https://thepartypalace.in) by writing and running an automated Playwright test script that executes all 11 functional checks. Any failure must be diagnosed and fixed before declaring done.

Purpose: Catch any production regressions in the just-shipped fulfillment selector and prove end-to-end correctness via headless browser automation.
Output: `playwright-verify-q20.js` (test script), `@playwright/test` installed as devDependency, terminal output showing 11/11 PASS.
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/sammy/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/sammy/OneDrive/Documents/Projects/party-palace/cart.js
@C:/Users/sammy/OneDrive/Documents/Projects/party-palace/styles.css
@C:/Users/sammy/OneDrive/Documents/Projects/party-palace/index.html
@C:/Users/sammy/OneDrive/Documents/Projects/party-palace/.planning/STATE.md

# Real DOM selectors confirmed from cart.js (lines 1219-1289):
#   Cart sidebar:                #cartSidebar (open via .cart-icon-btn click or toggleCart())
#   Fulfillment container:       .cart-fulfillment
#   Fulfillment option buttons:  .cart-fulfillment-option  (with .selected when active)
#   Option name span:            .cart-fulfillment-option-name  (text: "Pickup" / "Delivery")
#   Option price span:           .cart-fulfillment-option-price (text: "Free" / "$25")
#   Selection prompt:            .cart-fulfillment-prompt    (visible only when null)
#   Gate message:                .cart-fulfillment-gate-msg  (visible only when gated)
#   Subtotal row:                .cart-total-subtotal
#   Delivery fee row:            .cart-total-fee   (only rendered when rental in cart)
#   Grand total label/value:     .cart-total-grand  /  #cartTotal
#   Checkout button:             .cart-checkout-btn (gets HTML `disabled` attr when gated)
#   Quantity buttons (rental):   .chair-qty-btn  (label "Decrease quantity" / "Increase quantity")
#   Remove from cart:            .cart-item-remove (× button per item)
#   localStorage key:            partyPalaceFulfillment   (values: "pickup" | "delivery" | absent)
#
# Rental product slugs (RENTAL_QTY_CONFIG in cart.js lines 16-25):
#   chair-rental, 4-foot-table-rental, 6-foot-table-rental, 8-foot-table-rental,
#   10x10-tent-rental, 10x20-tent-rental, white-solid-panel-rental, window-panel-rental
#
# Non-rental: any 3D print or engraving product (not in RENTAL_QTY_CONFIG → no selector shown)
#
# Window globals exposed by cart.js (lines 1369-1372): toggleCart, addToCart, removeFromCart,
# adjustRentalQty, getFulfillmentMethod, setFulfillmentMethod, getDeliveryFee, hasRentalInCart
# These can be invoked directly via page.evaluate() to bypass slow DOM navigation.
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install Playwright and write the 11-check verification script</name>
  <files>
    C:\Users\sammy\OneDrive\Documents\Projects\party-palace\playwright-verify-q20.js
    C:\Users\sammy\OneDrive\Documents\Projects\party-palace\package.json
    C:\Users\sammy\OneDrive\Documents\Projects\party-palace\package-lock.json
  </files>
  <action>
    1. Check if Playwright is already installed:
       ```
       npx playwright --version
       ```
       If "command not found" or non-zero exit, install:
       ```
       npm install --save-dev @playwright/test
       npx playwright install chromium
       ```
       (Use `playwright` NOT `@playwright/test` import in the script — both work; require('playwright') is simpler for raw-API usage.)
       If `playwright` package itself isn't pulled in by `@playwright/test`, also install: `npm install --save-dev playwright`

    2. Write `playwright-verify-q20.js` at project root. It MUST:

       - Use `const { chromium } = require('playwright');` (raw API, NOT the test runner — run via `node`).
       - Launch headless Chromium with cache disabled:
         ```js
         const browser = await chromium.launch({
           headless: true,
           args: ['--disable-cache', '--disable-application-cache']
         });
         ```
       - For EACH check, create a FRESH incognito context to guarantee clean cart/localStorage:
         ```js
         const ctx = await browser.newContext({ storageState: undefined });
         const page = await ctx.newPage();
         // attach console listener BEFORE navigation
         const consoleErrors = [];
         page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
         page.on('pageerror', err => consoleErrors.push('PAGEERROR: ' + err.message));
         await page.goto('https://thepartypalace.in', { waitUntil: 'networkidle' });
         ```
         Close `ctx` at the end of each check.

       - Track results in an array: `[{ name: 'CHECK 1 ...', pass: true|false, error: '...' }]`.
       - On FAIL: `await page.screenshot({ path: `fail-check-${n}.png`, fullPage: true })` and `console.error` the actual DOM/state.
       - At the end, print a summary table and `process.exit(results.some(r => !r.pass) ? 1 : 0)`.

    3. Helper functions to define inside the script (use these instead of brittle UI clicks where possible — cart.js exposes everything on window):

       ```js
       // Add a product to cart by slug using the exposed window.addToCart or page DOM
       async function addRentalToCart(page, slug, qty = null) {
         // Use page.evaluate to invoke window globals directly — much more robust than clicking cards
         await page.evaluate(({ slug, qty }) => {
           // Find product card by slug in the global products array OR by data-slug on a card
           // Most reliable: navigate to rentals section and click the matching "Add to Cart"
           // Fallback: invoke window.addToCart(name, price, image, slug) directly if products exposed
           if (typeof window.addToCart === 'function') {
             // The signature in cart.js is addToCart(name, price, ...). Inspect the actual signature
             // by reading window.addToCart.toString() if needed. Use realistic args based on the slug.
           }
         }, { slug, qty });
       }
       ```
       NOTE TO EXECUTOR: Before writing the helpers, run a quick exploratory navigation in the script
       (or read cart.js's addToCart signature directly) to confirm how products are added. Two viable
       paths:
         (a) Click product card "Add to Cart" buttons (more realistic, slower) — find cards via
             `page.locator('.product-card', { hasText: 'Chair Rental' })` then click its Add button.
             For rental quantity, click +/− `.chair-qty-btn` BEFORE clicking Add if needed.
         (b) Inject directly via `window.addToCart(...)` (fast, bypasses UI) — read the addToCart
             signature in cart.js first; if it takes (name, price, image, slug, ...), call it with
             realistic values per slug.
       Pick whichever works reliably for ALL 11 checks. Prefer (a) for CHECK 10 (quantity controls)
       since that check specifically exercises the UI; (b) is fine for setup in other checks.

       ```js
       async function openCart(page) {
         await page.locator('.cart-icon-btn').first().click();
         await page.locator('#cartSidebar.open').waitFor({ timeout: 5000 });
       }

       async function clearCart(page) {
         // Easiest: page.evaluate(() => { window.cart && (window.cart.length = 0); localStorage.removeItem('partyPalaceFulfillment'); window.updateCartUI && window.updateCartUI(); });
         // Or use fresh context (preferred — already doing this per scenario).
       }
       ```

    4. Implement the 11 checks in order. Each check is its own async function returning {pass, error}.
       Use the EXACT selectors from the context block above. Specifically:

       - CHECK 1 (non-rental, no selector): Add any 3D print product. Open cart.
         Assert `await page.locator('.cart-fulfillment').count() === 0`.
         Assert `await page.locator('.cart-total-fee').count() === 0`.
         Read `#cartTotal` text, assert it equals subtotal text from `.cart-total-subtotal`.

       - CHECK 2 (rental, selector appears, none selected): Add chair rental. Open cart.
         Assert `.cart-fulfillment` is visible.
         Assert `.cart-fulfillment-option.selected` count === 0.
         Optionally assert `.cart-fulfillment-prompt` is visible (text "Please select pickup or delivery").

       - CHECK 3 (checkout gated): With CHECK 2 state, check `.cart-checkout-btn`.
         Assert `await page.locator('.cart-checkout-btn').isDisabled() === true`
         OR `.cart-fulfillment-gate-msg` is visible with text containing "Please select".

       - CHECK 4 (pickup → enabled, fee $0): Click the Pickup option:
         `await page.locator('.cart-fulfillment-option', { hasText: 'Pickup' }).click();`
         Assert `.cart-fulfillment-option.selected` text contains "Pickup".
         Assert `.cart-checkout-btn` is enabled.
         Read `.cart-total-fee` text — assert it contains "$0.00" or "Free" (cart.js renders "$0.00 (Pickup)").
         Assert grand total `#cartTotal` equals subtotal numerically.

       - CHECK 5 (delivery → +$25): Click Delivery option.
         Assert `.cart-total-fee` text contains "$25.00".
         Read subtotal from `.cart-total-subtotal` and grand total from `#cartTotal`; assert
         grand = subtotal + 25 (parse with regex `/\$([\d,]+\.\d{2})/`).

       - CHECK 6 (flat $25 with multiple rentals): Add a second rental (e.g., 6-foot-table-rental).
         Re-read `.cart-total-fee`; assert it STILL contains "$25.00" (never $50 or per-item).

       - CHECK 7 (mixed cart): Add a 3D print product on top of the rentals.
         Assert `.cart-fulfillment` still visible. Assert `.cart-total-fee` still "$25.00".

       - CHECK 8 (remove all rentals → selector gone): Click `.cart-item-remove` for each rental
         until only the 3D print remains. Wait briefly. Assert `.cart-fulfillment` count === 0 and
         `.cart-total-fee` count === 0. Also check localStorage was cleared:
         `await page.evaluate(() => localStorage.getItem('partyPalaceFulfillment')) === null`.

       - CHECK 9 (localStorage persistence): Fresh context. Add chair rental, open cart, click
         Delivery. Reload page (`await page.reload({ waitUntil: 'networkidle' })`). Open cart.
         Assert `.cart-fulfillment-option.selected` text contains "Delivery".
         Assert `.cart-total-fee` text contains "$25.00".
         NOTE: If cart itself doesn't persist across reload (depends on cart.js), this check still
         validates fulfillment state persists. If cart is empty after reload, log that as expected
         and only assert the localStorage key still equals 'delivery'.

       - CHECK 10 (quantity controls regression): Fresh context. Navigate to rentals, add a chair.
         Open cart. Read current qty from `.cart-item-name` (format: "Chair Rental (x15)"). Click
         the `+` `.chair-qty-btn` (the one NOT inside the disabled state). Wait, re-read qty —
         assert it increased by 1. Click `−`, assert it decreased by 1. Also assert the line total
         in `.cart-item-price` updated (parse $ value, confirm it changes proportionally).

       - CHECK 11 (no console errors): The `consoleErrors` array is collected across ALL checks.
         At the very end, assert `consoleErrors.length === 0`. If non-empty, list each error.
         Warnings (msg.type() === 'warning') are OK and ignored.

    5. Run the script:
       ```
       node playwright-verify-q20.js
       ```
       If any check fails, DIAGNOSE:
       - First inspect the fail-check-N.png screenshot
       - Then check whether the failure is a selector mismatch (test bug) or actual feature bug
       - If test bug: fix the script, re-run
       - If feature bug: fix cart.js / styles.css, commit and push to live site, wait for deployment,
         re-run from scratch
       All 11 MUST pass before completing the task.

    6. IMPORTANT — Do NOT use `@playwright/test`'s `test()` runner; use raw Playwright via the
       `playwright` package + plain `async function main() { ... }` pattern. This keeps the script
       runnable via `node playwright-verify-q20.js` per the constraint.

    7. Do NOT commit `node_modules/` or playwright browser binaries. Add them to .gitignore if
       not already (most likely already excluded — verify quickly).
  </action>
  <verify>
    Run from project root:
    ```
    node playwright-verify-q20.js
    ```
    Expected output ends with:
    ```
    ===== RESULTS =====
    CHECK 1  PASS  Non-rental cart: no selector
    CHECK 2  PASS  Rental cart: selector appears, nothing pre-selected
    CHECK 3  PASS  Checkout gate: button disabled before selection
    CHECK 4  PASS  Pickup selection: checkout enabled, fee = $0
    CHECK 5  PASS  Delivery selection: total updates to subtotal + $25
    CHECK 6  PASS  Flat $25 with multiple rentals
    CHECK 7  PASS  Mixed cart: selector still shows, $25 flat
    CHECK 8  PASS  Remove all rentals: selector disappears
    CHECK 9  PASS  localStorage persistence across reload
    CHECK 10 PASS  Quantity controls work
    CHECK 11 PASS  No console errors
    ===================
    11/11 passed
    ```
    And `echo $LASTEXITCODE` (PowerShell) prints 0.

    If FAIL: `fail-check-N.png` exists at project root showing the failure state, and stderr
    contains a diagnostic dump of the relevant DOM/localStorage state.
  </verify>
  <done>
    - `playwright-verify-q20.js` exists at project root, ~300-500 lines, self-contained
    - `@playwright/test` (and/or `playwright`) listed in package.json devDependencies
    - Running `node playwright-verify-q20.js` exits 0 with "11/11 passed"
    - Zero console errors observed on https://thepartypalace.in during the runs
    - If any feature bug was found, it was fixed + committed + pushed + re-verified
  </done>
</task>

</tasks>

<verification>
After Task 1 completes:

1. Confirm script exists:
   ```
   Test-Path playwright-verify-q20.js
   ```
   → True

2. Confirm Playwright is installed:
   ```
   npx playwright --version
   ```
   → prints a version (e.g. "Version 1.x.x")

3. Re-run end-to-end (idempotent):
   ```
   node playwright-verify-q20.js
   ```
   → Exits 0 with "11/11 passed"

4. Confirm no leftover screenshots from failures:
   ```
   Get-ChildItem fail-check-*.png -ErrorAction SilentlyContinue
   ```
   → No output (or all such files were from earlier diagnostic runs and have been cleaned up)
</verification>

<success_criteria>
- All 11 checks PASS on https://thepartypalace.in
- Script is reproducible: any subsequent `node playwright-verify-q20.js` invocation passes 11/11
- Zero browser console errors during execution
- Any bug uncovered during verification was fixed, committed, pushed, and re-verified before declaring done
- `playwright-verify-q20.js` and updated `package.json` / `package-lock.json` are committed to git
</success_criteria>

<output>
After completion, create `.planning/quick/21-playwright-automated-verification-of-qui/21-SUMMARY.md` summarizing:
- 11/11 PASS status
- Any feature bugs discovered + their fixes (commit hashes)
- How to re-run: `node playwright-verify-q20.js`
- Files added: playwright-verify-q20.js + package.json devDep changes
</output>
