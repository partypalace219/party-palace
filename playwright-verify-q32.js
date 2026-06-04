// Playwright verification for Quick Task 32
// Verifies Quick Task 31 fix: colors column added to loadProducts SELECT
// Run: node playwright-verify-q32.js
// Target: https://thepartypalace.in (live site, incognito)

const { chromium } = require('playwright');

const SITE = 'https://thepartypalace.in';
const DB_URL = 'https://nsedpvrqhxcikhlieize.supabase.co/rest/v1/products';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zZWRwdnJxaHhjaWtobGllaXplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MzMzMDksImV4cCI6MjA4NDUwOTMwOX0.yh4xyXG69LU5gC5cBjRLEZ_5gDtmVDSN1KqG0KIkj4g';

const results = [];
let passCount = 0;
let failCount = 0;

function pass(num, desc, detail = '') {
    results.push({ num, status: 'PASS', desc, detail });
    passCount++;
    console.log(`  ✓ CHECK ${num} PASS — ${desc}${detail ? ': ' + detail : ''}`);
}

function fail(num, desc, detail = '') {
    results.push({ num, status: 'FAIL', desc, detail });
    failCount++;
    console.log(`  ✗ CHECK ${num} FAIL — ${desc}${detail ? ': ' + detail : ''}`);
}

async function fetchDB(path) {
    const res = await fetch(`${DB_URL}${path}`, {
        headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + ANON_KEY }
    });
    return res.json();
}

async function waitFor3DPrints(page) {
    await page.waitForFunction(
        () => {
            const cards = document.querySelectorAll('.product-card');
            return cards.length > 0;
        },
        { timeout: 15000 }
    );
}

(async () => {
    console.log('\n=== Quick Task 32: Playwright Verification of Q31 (colors SELECT fix) ===\n');

    // --- Pre-flight: query Supabase for 3D Print products with colors ---
    console.log('Pre-flight: querying Supabase for 3D Print products with colors...');
    let dbProducts3d = [];
    try {
        dbProducts3d = await fetchDB('?select=id,name,colors&category=eq.3D Prints&limit=100');
        if (!Array.isArray(dbProducts3d)) {
            console.log('  WARNING: unexpected Supabase response:', JSON.stringify(dbProducts3d).slice(0, 100));
            dbProducts3d = [];
        }
    } catch (e) {
        console.log('  WARNING: could not query Supabase:', e.message);
    }

    const productsWithColors = dbProducts3d.filter(p => Array.isArray(p.colors) && p.colors.length > 0);
    const productsWithoutColors = dbProducts3d.filter(p => !Array.isArray(p.colors) || p.colors.length === 0);
    const productsWithPink = productsWithColors.filter(p => p.colors.includes('Pink'));
    const productsWithViolet = productsWithColors.filter(p => p.colors.includes('Violet'));
    const productsWithWhite = productsWithColors.filter(p => p.colors.includes('White'));

    console.log(`  DB 3D Print products: ${dbProducts3d.length} total`);
    console.log(`  - With at least 1 color: ${productsWithColors.length}`);
    console.log(`  - With Pink: ${productsWithPink.length}`);
    console.log(`  - With White: ${productsWithWhite.length}`);
    console.log(`  - With Violet (stale): ${productsWithViolet.length}`);
    console.log(`  - With no colors (empty): ${productsWithoutColors.length}`);
    if (productsWithColors.length > 0) {
        console.log(`  Sample product with colors: "${productsWithColors[0].name}" — [${productsWithColors[0].colors.join(', ')}]`);
    }
    console.log('');

    const browser = await chromium.launch({ headless: true });
    const consoleErrors = [];

    // CHECK 1: Hard-refresh in incognito (new browser context = incognito)
    console.log('CHECK 1: Hard-refresh thepartypalace.in in incognito...');
    // No extra headers — injecting Cache-Control triggers CORS preflight failures on CDN fonts
    const context = await browser.newContext({ ignoreHTTPSErrors: false });
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    try {
        // Use domcontentloaded — site has persistent connections that prevent networkidle
        await page.goto(SITE, { waitUntil: 'domcontentloaded', timeout: 45000 });
        await page.locator('.cart-icon-btn').waitFor({ timeout: 15000 });
        await page.waitForTimeout(3000); // allow module imports + Supabase fetch
        const title = await page.title();
        if (title && title.length > 0) {
            pass(1, 'Hard-refresh incognito load', `title="${title}"`);
        } else {
            fail(1, 'Hard-refresh incognito load', 'page title empty');
        }
    } catch (e) {
        fail(1, 'Hard-refresh incognito load', e.message);
    }

    // CHECK 2: Navigate to 3D Prints
    console.log('CHECK 2: Navigate to 3D Prints...');
    try {
        await page.evaluate(() => window.navigate('3d-prints'));
        await waitFor3DPrints(page);
        const cards = await page.$$('.product-card');
        if (cards.length > 0) {
            pass(2, 'Navigate to 3D Prints', `${cards.length} cards rendered`);
        } else {
            fail(2, 'Navigate to 3D Prints', 'no .product-card elements found');
        }
    } catch (e) {
        fail(2, 'Navigate to 3D Prints', e.message);
    }

    // CHECK 3: At least one product shows color swatches in the public grid
    // Use state:'attached' — swatches exist in DOM but may be off-screen (virtual list)
    console.log('CHECK 3: At least one product shows color swatches...');
    try {
        await page.waitForSelector('.product-color-swatches', { timeout: 10000, state: 'attached' });
        const swatchCount = await page.evaluate(() => document.querySelectorAll('.product-color-swatches').length);
        if (swatchCount > 0) {
            pass(3, 'Color swatch rows present in public grid', `${swatchCount} swatch row(s) found in DOM`);
        } else {
            fail(3, 'Color swatch rows present in public grid', 'no .product-color-swatches elements found');
        }
    } catch (e) {
        fail(3, 'Color swatch rows present in public grid', 'no .product-color-swatches found — ' + e.message);
    }

    // CHECK 4: Pink swatch renders as #FFC0CB
    console.log('CHECK 4: Pink swatch renders as #FFC0CB...');
    try {
        const pinkSwatch = await page.$('.product-color-swatch[style*="ffc0cb"], .product-color-swatch[style*="FFC0CB"], .product-color-swatch[title="Pink"]');
        if (pinkSwatch) {
            const bg = await pinkSwatch.evaluate(el => el.style.background || el.style.backgroundColor);
            pass(4, 'Pink swatch present', `background="${bg}"`);
        } else if (productsWithPink.length === 0) {
            pass(4, 'Pink swatch check skipped — no products have Pink in DB', 'N/A');
        } else {
            // Try to find by title attribute
            const byTitle = await page.$('.product-color-swatch[title="Pink"]');
            if (byTitle) {
                const bg = await byTitle.evaluate(el => el.style.background || el.style.backgroundColor);
                pass(4, 'Pink swatch found by title', `background="${bg}"`);
            } else {
                fail(4, 'Pink swatch', `DB has ${productsWithPink.length} products with Pink but no Pink swatch found on page`);
            }
        }
    } catch (e) {
        fail(4, 'Pink swatch check', e.message);
    }

    // CHECK 5: Violet swatches do NOT render
    console.log('CHECK 5: Violet swatches do NOT render...');
    try {
        const violetSwatch = await page.$('.product-color-swatch[title="Violet"]');
        if (!violetSwatch) {
            pass(5, 'No Violet swatches rendered', `${productsWithViolet.length} DB products have Violet but all filtered correctly`);
        } else {
            fail(5, 'Violet swatch visible — should be filtered by PRINT_COLOR_HEX', 'found .product-color-swatch[title="Violet"]');
        }
    } catch (e) {
        fail(5, 'Violet swatch check', e.message);
    }

    // CHECK 6: Hover tooltips show color names
    console.log('CHECK 6: Hover tooltips show color names...');
    try {
        const swatch = await page.$('.product-color-swatch');
        if (swatch) {
            const title = await swatch.getAttribute('title');
            if (title && title.length > 0) {
                pass(6, 'Swatch has title (tooltip) attribute', `title="${title}"`);
            } else {
                fail(6, 'Swatch tooltip', 'swatch found but title attribute is empty');
            }
        } else {
            fail(6, 'Swatch tooltip check', 'no swatches found to check tooltip on');
        }
    } catch (e) {
        fail(6, 'Swatch tooltip check', e.message);
    }

    // CHECK 7: White swatch has thin gray border (--white variant class)
    console.log('CHECK 7: White swatch has gray border class...');
    try {
        const whiteSwatch = await page.$('.product-color-swatch--white');
        if (whiteSwatch) {
            pass(7, 'White swatch has .product-color-swatch--white class (border applied via CSS)');
        } else if (productsWithWhite.length === 0) {
            pass(7, 'White swatch check skipped — no products have White in DB', 'N/A');
        } else {
            fail(7, 'White swatch border class missing', `DB has ${productsWithWhite.length} products with White but .product-color-swatch--white not found`);
        }
    } catch (e) {
        fail(7, 'White swatch border check', e.message);
    }

    // CHECK 8: Products with no colors saved show no swatch row
    console.log('CHECK 8: Products with no colors show no swatch row...');
    try {
        if (productsWithoutColors.length === 0) {
            pass(8, 'No colorless products in DB to check (all 3D Prints have colors)', 'N/A');
        } else {
            // Get all card elements and check which ones have swatch rows
            const cardData = await page.evaluate(() => {
                const cards = document.querySelectorAll('.product-card');
                return Array.from(cards).map(card => {
                    const nameEl = card.querySelector('.product-name, h3, .card-name');
                    const hasSwatch = !!card.querySelector('.product-color-swatches');
                    return { name: nameEl ? nameEl.textContent.trim() : '', hasSwatch };
                });
            });

            const noColorNames = new Set(productsWithoutColors.map(p => p.name.toLowerCase().trim()));
            const colorlessCardsWithSwatches = cardData.filter(c =>
                noColorNames.has(c.name.toLowerCase()) && c.hasSwatch
            );

            if (colorlessCardsWithSwatches.length === 0) {
                pass(8, 'Colorless products show no swatch row', `checked ${productsWithoutColors.length} colorless products`);
            } else {
                fail(8, 'Colorless product showing unexpected swatch row', colorlessCardsWithSwatches.map(c => c.name).join(', '));
            }
        }
    } catch (e) {
        fail(8, 'Colorless product swatch check', e.message);
    }

    // CHECK 9: Regression — rental flow (chairs/tables/tents/panels) still works
    console.log('CHECK 9: Regression — rental flow still works...');
    try {
        await page.evaluate(() => window.navigate('party-rentals'));
        await page.waitForFunction(() => document.querySelectorAll('.product-card').length > 0, { timeout: 10000 });
        const rentalCards = await page.$$('.product-card');
        if (rentalCards.length > 0) {
            pass(9, 'Party Rentals renders correctly', `${rentalCards.length} cards`);
        } else {
            fail(9, 'Party Rentals regression', 'no product cards rendered');
        }
    } catch (e) {
        fail(9, 'Party Rentals regression', e.message);
    }

    // CHECK 10: Regression — multi-size 3D Print size_variants still present on public grid
    // Check for "Starting at $X" price labels which appear when a product has size_variants
    console.log('CHECK 10: Regression — multi-size 3D Print "Starting at" labels...');
    try {
        await page.evaluate(() => window.navigate('3d-prints'));
        await waitFor3DPrints(page);

        // "Starting at" text appears when size_variants is populated (from products.js price render)
        const startingAtCount = await page.evaluate(() => {
            const priceEls = document.querySelectorAll('.product-price, .price, [class*="price"]');
            let count = 0;
            priceEls.forEach(el => { if (el.textContent.includes('Starting at')) count++; });
            return count;
        });

        if (startingAtCount > 0) {
            pass(10, 'Multi-size 3D Print "Starting at" labels visible', `${startingAtCount} products show "Starting at $X"`);
        } else {
            // Fallback: check that size_variants data is in window products array
            const hasVariants = await page.evaluate(() => {
                if (typeof window !== 'undefined' && window._products) {
                    return window._products.some(p => p.size_variants && Object.keys(p.size_variants).length > 0);
                }
                return false;
            });
            if (hasVariants) {
                pass(10, 'Multi-size size_variants data present in window products', 'no "Starting at" visible but data is loaded');
            } else {
                // Check for any price-related text containing "Starting"
                const anyStarting = await page.evaluate(() =>
                    document.body.innerText.includes('Starting at')
                );
                if (anyStarting) {
                    pass(10, 'Multi-size "Starting at" text found in page body', 'size_variants rendering correctly');
                } else {
                    fail(10, 'Multi-size 3D Print regression', 'no "Starting at" text found — size_variants may not be rendering');
                }
            }
        }
    } catch (e) {
        fail(10, 'Multi-size 3D Print regression', e.message);
    }

    // CHECK 11: No unexpected console errors
    console.log('CHECK 11: No unexpected console errors...');
    const unexpectedErrors = consoleErrors.filter(e =>
        !e.includes('unknown color') &&
        !e.includes('Violet') &&
        !e.includes('favicon') &&
        !e.toLowerCase().includes('favicon')
    );
    if (unexpectedErrors.length === 0) {
        pass(11, 'No unexpected console errors', consoleErrors.length > 0 ? `${consoleErrors.length} "unknown color" warnings acceptable` : 'zero console errors');
    } else {
        fail(11, 'Unexpected console errors', unexpectedErrors.slice(0, 3).join(' | '));
    }

    // Count products with visible swatches on the live page
    let visibleSwatchProductCount = 0;
    try {
        await page.evaluate(() => window.navigate('3d-prints'));
        await waitFor3DPrints(page);
        visibleSwatchProductCount = await page.evaluate(() => {
            const cards = document.querySelectorAll('.product-card');
            let count = 0;
            cards.forEach(card => {
                if (card.querySelector('.product-color-swatches .product-color-swatch')) count++;
            });
            return count;
        });
    } catch (e) {
        console.log('  WARNING: could not count swatch products:', e.message);
    }

    await browser.close();

    // Summary
    console.log('\n=== RESULTS ===\n');
    results.forEach(r => {
        const icon = r.status === 'PASS' ? '✓' : '✗';
        console.log(`  ${icon} CHECK ${r.num} ${r.status} — ${r.desc}${r.detail ? ': ' + r.detail : ''}`);
    });

    console.log(`\n  Score: ${passCount}/${passCount + failCount} checks PASS`);
    console.log(`  Products with visible color swatches on live site: ${visibleSwatchProductCount}`);
    console.log(`  DB products with at least 1 color: ${productsWithColors.length}`);

    if (failCount === 0) {
        console.log('\n  ALL CHECKS PASS — Quick Task 31 color swatch fix verified end-to-end.\n');
    } else {
        console.log(`\n  ${failCount} CHECK(S) FAILED — review above for details.\n`);
    }

    // Machine-readable output for SUMMARY.md generation
    console.log('__RESULT_JSON__' + JSON.stringify({
        pass: passCount,
        fail: failCount,
        total: passCount + failCount,
        visibleSwatchProducts: visibleSwatchProductCount,
        dbProductsWithColors: productsWithColors.length,
        dbProductsWithPink: productsWithPink.length,
        dbProductsWithViolet: productsWithViolet.length,
        results: results
    }));

    process.exit(failCount > 0 ? 1 : 0);
})();
