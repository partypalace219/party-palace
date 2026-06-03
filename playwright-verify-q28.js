'use strict';

const { chromium } = require('playwright');
const BASE_URL = 'https://thepartypalace.in';

async function main() {
    console.log('playwright-verify-q28.js — Quick Task 28 favicon verification');
    console.log(`Site: ${BASE_URL}\n`);

    const browser = await chromium.launch({ headless: true });
    const results = [];

    // Check 1: <link rel="icon"> points to party-palace-logo.png
    {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        const errors = [];
        page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
        page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));

        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const iconHref = await page.evaluate(() => {
            const el = document.querySelector('link[rel="icon"]');
            return el ? el.getAttribute('href') : null;
        });

        let pass = iconHref && iconHref.includes('party-palace-logo.png');
        let error = pass ? '' : `link[rel="icon"] href="${iconHref}" — expected party-palace-logo.png`;

        console.log(`[${pass ? 'PASS' : 'FAIL'}] link[rel="icon"] points to party-palace-logo.png`);
        if (!pass) {
            console.log(`       ERROR: ${error}`);
            await page.screenshot({ path: 'fail-check-q28-1.png', fullPage: true });
        }
        results.push({ name: 'link[rel="icon"] points to party-palace-logo.png', pass, error });

        // Check 2: apple-touch-icon also points to party-palace-logo.png
        const appleHref = await page.evaluate(() => {
            const el = document.querySelector('link[rel="apple-touch-icon"]');
            return el ? el.getAttribute('href') : null;
        });
        const pass2 = appleHref && appleHref.includes('party-palace-logo.png');
        const error2 = pass2 ? '' : `link[rel="apple-touch-icon"] href="${appleHref}" — expected party-palace-logo.png`;
        console.log(`[${pass2 ? 'PASS' : 'FAIL'}] link[rel="apple-touch-icon"] points to party-palace-logo.png`);
        if (!pass2) console.log(`       ERROR: ${error2}`);
        results.push({ name: 'link[rel="apple-touch-icon"] points to party-palace-logo.png', pass: pass2, error: error2 });

        // Check 3: no obsolete favicon refs (favicon-32x32, favicon-16x16, logo.svg)
        const obsoleteRefs = await page.evaluate(() => {
            const links = Array.from(document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]'));
            return links.map(l => l.getAttribute('href')).filter(h =>
                h && (h.includes('favicon-32x32') || h.includes('favicon-16x16') || h.includes('logo.svg') || h.includes('favicon-192x192'))
            );
        });
        const pass3 = obsoleteRefs.length === 0;
        const error3 = pass3 ? '' : `Obsolete favicon refs still present: ${obsoleteRefs.join(', ')}`;
        console.log(`[${pass3 ? 'PASS' : 'FAIL'}] No obsolete favicon refs (favicon-32x32, favicon-16x16, logo.svg)`);
        if (!pass3) console.log(`       ERROR: ${error3}`);
        results.push({ name: 'No obsolete favicon refs', pass: pass3, error: error3 });

        // Check 4: no JS console errors
        const jsErrors = errors.filter(e => !e.includes('favicon') && !e.includes('net::ERR') && !e.includes('ERR_BLOCKED'));
        const pass4 = jsErrors.length === 0;
        const error4 = pass4 ? '' : `Console errors: ${jsErrors.slice(0, 3).join('; ')}`;
        console.log(`[${pass4 ? 'PASS' : 'FAIL'}] No JS console errors`);
        if (!pass4) console.log(`       ERROR: ${error4}`);
        results.push({ name: 'No JS console errors', pass: pass4, error: error4 });

        await ctx.close();
    }

    // Check 5: header logo img still renders (regression)
    {
        const ctx = await browser.newContext();
        const page = await ctx.newPage();
        await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);

        const logoSrc = await page.evaluate(() => {
            const img = document.querySelector('.logo img, header img, .header img, .nav-logo img');
            return img ? img.src : null;
        });
        const pass5 = logoSrc && logoSrc.includes('party-palace-logo');
        const error5 = pass5 ? '' : `Header logo img not found or src="${logoSrc}"`;
        console.log(`[${pass5 ? 'PASS' : 'FAIL'}] REGRESSION: header logo still renders`);
        if (!pass5) {
            console.log(`       ERROR: ${error5}`);
            await page.screenshot({ path: 'fail-check-q28-5.png', fullPage: true });
        }
        results.push({ name: 'REGRESSION: header logo still renders', pass: pass5, error: error5 });
        await ctx.close();
    }

    await browser.close();

    const passed = results.filter(r => r.pass).length;
    const failed = results.filter(r => !r.pass).length;
    console.log(`\nResults: ${passed}/${results.length} passed`);
    if (failed > 0) {
        console.log('\nFAILED checks:');
        results.filter(r => !r.pass).forEach(r => console.log(`  - ${r.name}: ${r.error}`));
        process.exit(1);
    } else {
        console.log('All checks PASS.');
        process.exit(0);
    }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
