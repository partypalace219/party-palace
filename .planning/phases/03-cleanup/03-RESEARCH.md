# Phase 3: Cleanup - Research

**Researched:** 2026-04-09
**Domain:** Static file hygiene, JS data migration, HTML attribute patching
**Confidence:** HIGH

## Summary

Phase 3 is a pure code-and-file cleanup with no new dependencies. All three tasks operate directly on the existing codebase: `app.js` (5,639 lines), `server.js`, and the Railway/serve-handler static file server. No library upgrades or external APIs are involved beyond the Supabase connection already in place.

The largest risk is the `popularProducts` removal in 03-02. The hardcoded array (lines 51-54 of `app.js`) currently **overwrites** the database `featured` value every time `loadProducts()` runs. Simply deleting lines 51-54 will cause `product.popular` to be driven by the already-fetched `p.featured` value from Supabase (line 32 of `app.js`), which is exactly the desired behavior. No schema changes are needed — the `featured` column already exists and is already fetched in phase 1 of the product load.

The `loading="lazy"` task (03-03) requires adding the attribute to four `<img>` tag locations in `app.js`: two inside `renderDynamicEngravingProducts` / `renderDynamicPrints3dProducts` (lines 168, 220), and two inside `createProductCard` (line 2131) and `renderProductDetail` (lines 2258, 2274). One gallery image at line 3631 already has `loading="lazy"` and should be left unchanged.

**Primary recommendation:** Execute tasks in order 03-01 → 03-02 → 03-03. Each is independent but ordering avoids confusion when verifying the public root state.

## Standard Stack

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| `git rm` | system | Remove tracked files from repo and working tree | Single command removes from disk and stages the deletion |
| `serve-handler` | ^6.1.5 (already installed) | Static file server used in production via Railway | Already the production server — no new dependency |
| Supabase REST API | v2 (already in use) | Drives `featured` column lookup | Already integrated, `featured` column already fetched |

### No New Dependencies

This phase requires zero npm installs. Everything uses existing infrastructure:
- File deletion: `git rm`
- `featured` data: already fetched in `loadProducts()` phase 1 query (`cols` string, line 15)
- `loading="lazy"`: native HTML attribute, no library needed

## Architecture Patterns

### Current Project Structure (relevant to this phase)
```
party-palace/               # PUBLIC WEB ROOT (served by serve-handler)
├── app.js                  # Main JS — contains popularProducts array + img tags
├── server.js               # serve-handler static server
├── index.html              # Entry point
├── *.backup*               # 24 backup files — SERVED PUBLICLY, must be removed
├── *.py                    # 6 Python scripts — SERVED PUBLICLY, must be removed
├── *.sh                    # 1 shell script — SERVED PUBLICLY, must be removed
├── *.sql                   # SQL migration files — consider moving
└── scripts/                # DOES NOT EXIST YET — must be created for migration scripts
```

### Pattern 1: Git-tracked file removal
**What:** Use `git rm` (not plain `rm`) so the deletion is staged automatically.
**When to use:** For every backup file and Python/shell script being removed from the public root.
**Example:**
```bash
# Remove all backup files in one command
git rm app.js.backup app.js.backup.pre-images app.js.backup2 app.js.backup3 \
       app.js.backup5 app.js.backup6 app.js.backup7 app.js.backup8 \
       app.js.backup9 app.js.backup10 app.js.backup11 app.js.backup12 \
       app.js.backup13 index.html.backup.bloated index.html.backup4 \
       index.html.backup5 index.html.backup6 index.html.backup7 \
       index.html.backup8 index.html.backup9 index.html.backup10 \
       index.html.backup11 index.html.backup12 index.html.backup13

# Move Python scripts to non-served directory
mkdir -p scripts
git mv extract_products.py generate_image_urls.py organize_images.py \
        process_logo.py run_migration.py upload_images_to_supabase.py scripts/
git mv count_gallery.sh scripts/
```

### Pattern 2: Removing the popularProducts override
**What:** Delete lines 50-54 in `app.js` — the comment and the array/forEach that overrides `product.popular`.
**When to use:** 03-02 task only.

Current code (lines 50-54):
```javascript
// Set popular products (override database values)
const popularProducts = ['Specialty Arch', 'Chiara Arch', 'Spiral Columns', 'Flower Walls', 'Balloon Centerpieces', 'Vases', 'Custom Lithophane'];
products.forEach(product => {
    product.popular = popularProducts.includes(product.name);
});
```

After removal, `product.popular` is set from `p.featured` at line 32:
```javascript
popular: p.featured,   // this line already exists — no change needed
```

The `featured` column is already in the `cols` fetch string at line 15. No additional changes needed.

### Pattern 3: Adding loading="lazy" to dynamic img tags
**What:** Add `loading="lazy"` attribute to all dynamically generated `<img>` elements in `app.js`.
**When to use:** 03-03 task only. Touch only dynamic (JS-generated) images, not static HTML `<img>` tags.

Locations requiring the attribute (none currently have it except gallery line 3631):

| Line | Context | Current tag |
|------|---------|-------------|
| 168 | `renderDynamicEngravingProducts` | `<img src="" alt="" style="...">` |
| 220 | `renderDynamicPrints3dProducts` | `<img src="" alt="" style="...">` |
| 2131 | `createProductCard` (primary image) | `<img src="${product.images[0]}" ...>` |
| 2131 | `createProductCard` (secondary image) | `<img src="${product.images[1]}" ...>` |
| 2258 | `renderProductDetail` (main image) | `<img src="${product.images[0]}" ...>` |
| 2274 | `renderProductDetail` (thumbnail loop) | `<img src="${img}" ...>` |

**Do NOT change:** Line 3631 already has `loading="lazy"` — leave it unchanged.

### Anti-Patterns to Avoid
- **Using `rm` instead of `git rm`:** Plain `rm` leaves the deletion unstaged; git still tracks the file as "deleted but not staged."
- **Moving Python scripts inside the public root:** The `scripts/` directory must be at project root level — `serve-handler` serves the entire `.` directory; any subdirectory is still public. However, since Railway's `serve-handler` serves from `.` with `directoryListing: false`, files in subdirectories ARE still accessible by direct URL. The only true fix for CLN-01 is `git rm` (deletion), not moving to a subdirectory.
- **Touching the `featured` column or Supabase schema:** The column exists, is fetched, and is already mapped to `product.popular`. No DB changes needed for 03-02.
- **Adding `loading="lazy"` to the lightbox img tag (line 3747):** The lightbox `<img id="lightboxImg" src="" alt="">` is always in the DOM but starts with empty `src`; it's controlled by user interaction. Do not add lazy loading here.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Blocking backup file access | Custom middleware or .htaccess rules | `git rm` to delete the files | Files not on disk cannot be served; middleware still exposes them to path traversal risks |
| Detecting which products are "popular" | Custom scoring or caching layer | Supabase `featured` boolean column | Already exists, already fetched, already mapped to `product.popular` |

**Key insight:** The simplest solutions are correct here. Delete files rather than hide them. Use the already-fetched DB column rather than maintaining a parallel JS array.

## Common Pitfalls

### Pitfall 1: serve-handler serves ALL files including scripts subdirectory
**What goes wrong:** Moving `.py` files to `scripts/` (a subdirectory of the web root) does not block HTTP access — `http://site/scripts/run_migration.py` still serves the file.
**Why it happens:** `serve-handler` is configured with `public: '.'` and only disables directory listing, not file access.
**How to avoid:** For CLN-01, `git rm` the backup files outright. For Python scripts, per the requirement "moved to a non-served `/scripts` directory" — if this means a project-level directory outside the served root, note that the entire project IS the served root. Clarify intent: either delete entirely or accept that subdirectory move only removes from directory listing, not from HTTP access.
**Warning signs:** After "moving" files, `curl https://site/scripts/run_migration.py` still returns 200.

**Recommendation:** Delete backup files with `git rm`. For Python migration scripts, since CLN-01 says "moved to a non-served `/scripts` directory" and the entire project is the web root, treat this as: delete the `.py` files from git (they are one-time migration scripts, not needed in the deployed repo). If the user wants to keep them for local use, `.gitignore` them after deletion.

### Pitfall 2: popularProducts array silently re-introduced
**What goes wrong:** If someone adds new products and notices the Popular badge is missing, they might re-add a hardcoded array without realizing the `featured` column is the source of truth.
**Why it happens:** The comment above the old array said "Set popular products (override database values)" — the override intent was explicit.
**How to avoid:** After removing the array, update the Supabase `featured` column for any products that should be marked popular. Verify the badge appears.
**Warning signs:** `featured = true` in Supabase but no Popular badge on the card.

### Pitfall 3: Missing loading="lazy" on one of the img tag locations
**What goes wrong:** The success criterion says "All dynamically rendered product `<img>` tags include `loading='lazy'`" — missing even one location fails the check.
**Why it happens:** `app.js` has multiple product rendering functions (engraving, 3D prints, catalog cards, detail page), each with their own img tags.
**How to avoid:** After adding the attribute, run: `grep -n '<img' app.js | grep -v loading` to find any remaining img tags without the attribute. The only acceptable exceptions are: lightbox img (line 3747, empty src), staff table thumb (line 4877, already in admin area), and the gallery img at line 3631 (already has lazy).
**Warning signs:** DOM inspection after products load shows `<img src="..." alt="...">` without `loading="lazy"`.

### Pitfall 4: img src="" trick breaks with loading="lazy" on some browsers
**What goes wrong:** Lines 168 and 220 use `<img src="" alt="" ...>` with a deferred `imgEl.src = image` assignment. Adding `loading="lazy"` here is safe — the browser won't attempt to load until the element is near the viewport, and by then the JS has already set the `src`.
**Why it happens:** Concern that lazy loading might conflict with the two-phase image loading pattern already in use.
**How to avoid:** No special handling needed. The pattern is safe. `loading="lazy"` is a hint to the browser about when to initiate the network request, not a blocker on setting the `src` attribute via JS.

## Code Examples

### 03-01: Removing all backup files
```bash
# From project root — stage all deletions in one command
git rm \
  app.js.backup app.js.backup.pre-images \
  app.js.backup2 app.js.backup3 app.js.backup5 app.js.backup6 \
  app.js.backup7 app.js.backup8 app.js.backup9 app.js.backup10 \
  app.js.backup11 app.js.backup12 app.js.backup13 \
  index.html.backup.bloated \
  index.html.backup4 index.html.backup5 index.html.backup6 index.html.backup7 \
  index.html.backup8 index.html.backup9 index.html.backup10 \
  index.html.backup11 index.html.backup12 index.html.backup13

# Remove Python scripts and shell script
git rm extract_products.py generate_image_urls.py organize_images.py \
       process_logo.py run_migration.py upload_images_to_supabase.py \
       count_gallery.sh
```

### 03-02: Remove popularProducts override (app.js lines 50-54)
Remove these exact lines from `loadProducts()` in `app.js`:
```javascript
                // Set popular products (override database values)
                const popularProducts = ['Specialty Arch', 'Chiara Arch', 'Spiral Columns', 'Flower Walls', 'Balloon Centerpieces', 'Vases', 'Custom Lithophane'];
                products.forEach(product => {
                    product.popular = popularProducts.includes(product.name);
                });
```
No replacement code is needed — `product.popular` is already set from `p.featured` at line 32.

### 03-03: Adding loading="lazy" — example for renderDynamicEngravingProducts (line 168)
```javascript
// Before:
${image ? `<img src="" alt="" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${icon}</span>';">` : `<span>${icon}</span>`}

// After:
${image ? `<img src="" alt="" loading="lazy" style="width: 100%; height: 100%; object-fit: cover; object-position: center;" onerror="this.style.display='none'; this.parentElement.innerHTML='<span>${icon}</span>';">` : `<span>${icon}</span>`}
```

### Verification: Check no img tags are missing loading="lazy"
```bash
grep -n '<img' app.js | grep -v 'loading='
# Expected output: only lightbox (line 3747), staff thumb (line 4877)
# All product-rendering img tags should have loading="lazy"
```

### Verification: Confirm backup files are gone
```bash
curl -I https://[deployed-url]/app.js.backup
# Expected: HTTP 404
```

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|-----------------|--------|
| Hardcoded `popularProducts` JS array | Supabase `featured` boolean column | DB is single source of truth; staff portal can toggle Popular badge without code deploy |
| No `loading="lazy"` on dynamic images | Native `loading="lazy"` attribute | Browser defers off-screen image loads; reduces initial page bandwidth |
| Backup files in web root | Files deleted from git | No sensitive data exposed via direct URL |

## Open Questions

1. **Python script disposition**
   - What we know: CLN-01 says "moved to a non-served `/scripts` directory" but the entire project root is the web root
   - What's unclear: Does the user want to keep these scripts in git history (for reference) or delete them entirely?
   - Recommendation: Delete with `git rm` — they are one-time migration scripts that have already been run. If preservation is desired, add to `.gitignore` instead (but they'd still be accessible via direct URL on current deploy until Railway rebuilds).

2. **SQL files disposition**
   - What we know: `migrate_products.sql`, `schema.sql`, `setup_database.sql` are in the public root but CLN-01 only mentions `.backup*` files and Python scripts
   - What's unclear: Should SQL files also be removed? They contain schema information.
   - Recommendation: Out of scope for this phase per CLN-01 requirements. Flag for a future cleanup phase if desired.

3. **Supabase featured values for existing products**
   - What we know: After removing the `popularProducts` array, the Popular badge will be driven by `featured` column
   - What's unclear: Are the 7 previously-hardcoded products already marked `featured = true` in Supabase?
   - Recommendation: Before or immediately after deploying 03-02, verify via Supabase dashboard that the 7 products (Specialty Arch, Chiara Arch, Spiral Columns, Flower Walls, Balloon Centerpieces, Vases, Custom Lithophane) have `featured = true`. If not, update them first.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `app.js` (5,639 lines) — all line numbers cited are verified
- `server.js` — confirms `serve-handler` with `public: '.'` and `directoryListing: false`
- `package.json` — confirms `serve-handler ^6.1.5`, no build step
- File system listing — confirmed 24 backup files, 6 Python scripts, 1 shell script in public root
- `node_modules/serve-handler/readme.md` — confirmed `unlisted` option only affects directory listing, not file access

### Secondary (MEDIUM confidence)
- MDN Web Docs — `loading="lazy"` is a standard HTML attribute supported in all modern browsers (Chrome 77+, Firefox 75+, Safari 15.4+)
- serve-handler behavior with subdirectories — confirmed via reading source config; files in subdirectories remain accessible by direct URL

## Metadata

**Confidence breakdown:**
- File inventory (03-01): HIGH — directly listed from filesystem
- popularProducts removal (03-02): HIGH — exact lines identified in app.js, `featured` column already fetched and mapped
- loading="lazy" locations (03-03): HIGH — all img tags in app.js located and verified
- serve-handler subdirectory behavior: HIGH — verified via readme

**Research date:** 2026-04-09
**Valid until:** 2026-05-09 (stable codebase, no fast-moving dependencies)
