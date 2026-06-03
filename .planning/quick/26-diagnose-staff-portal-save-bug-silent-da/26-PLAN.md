---
phase: quick-26
plan: 26
type: execute
wave: 1
depends_on: []
files_modified: []
autonomous: true

must_haves:
  truths:
    - "Root cause identified for Panel sub_category reverting to Tents and slug rewrite on edit"
    - "Root cause identified for Black tumbler sub_category Wood->Metal not reflecting on live site"
    - "Root cause identified for Party Decor uploaded images not appearing on live site"
    - "Complete UI-field-to-payload mapping produced, flagging dropped and auto-overwritten fields"
    - "No code changed, no DB rows written"
  artifacts:
    - path: ".planning/quick/26-diagnose-staff-portal-save-bug-silent-da/26-SUMMARY.md"
      provides: "Complete diagnostic report"
      min_lines: 60
  key_links:
    - from: "staff.js handleStaffProductSubmit"
      to: "supabase products.update payload"
      via: "field mapping analysis"
      pattern: "update\\(productData\\)"
---

<objective>
DIAGNOSTIC ONLY. Identify the root causes of silent data corruption in the Party Palace staff portal save handler. Three confirmed symptoms must each be traced to a concrete code/data cause:
1. Panel products — sub_category flips "Panels"->"Tents" and slug gets rewritten on edit
2. Black tumbler (Engraving) — sub_category Wood->Metal shows in portal but live site still shows Wood
3. Party Decor — newly uploaded images do not appear on live site

Purpose: Give the user an exact, evidence-backed explanation so a follow-up fix plan can be scoped precisely.
Output: A diagnostic report written to 26-SUMMARY.md. No code edits. No DB writes. No commits except the final report (per quick-task SUMMARY commit).
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/sammy/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@staff.js
@index.html
@products.js

# Key already-located anchors (verified during planning):
# - Save handler: handleStaffProductSubmit() at staff.js ~line 1320-1440
# - Slug generation: staff.js line 1355 (regenerated from name.toLowerCase() on EVERY save)
# - Payload object: staff.js lines 1377-1395 (productData)
# - Edit prefill: openStaffProductModal() staff.js ~lines 1242-1296
# - Sub-category prefill: populateSubCategoryOptions(category, sub_category) called at line 1259
# - Validation against window.ITEM_CATEGORIES at lines 1338-1341
# - Image columns in select: image_url, image_urls (staff.js line 243)
# - Image upload: uploadAllNewImages(slug) at staff.js line 1360
</context>

<tasks>

<task type="auto">
  <name>Task 1: Static code inspection — field mapping, slug, sub_category, image upload</name>
  <files>none (read-only analysis of staff.js, index.html, products.js)</files>
  <action>
    Read staff.js and index.html. Produce a precise, line-referenced analysis. DO NOT modify any file.

    A. Save handler: Confirm handleStaffProductSubmit (staff.js ~1320). Report exact line range and signature.

    B. Complete field mapping table. Three columns:
       - UI form field (id in index.html staff portal section, e.g. staff-product-name)
       - productData payload key (staff.js 1377-1395)
       - Source/transform (direct read, computed, auto-generated, or MISSING)
       Then explicitly flag:
       - UI fields that exist in the form but are NOT in productData (silently dropped on save)
       - productData keys that are NOT read from a UI field (auto-generated — risk of overwriting saved data). Pay special attention to slug, image_url, image_urls, size_variants, colors, price.

    C. Slug handling: Confirm slug is regenerated from name on EVERY save (line 1355) — i.e. it runs on EDIT, not just CREATE, and the previously-saved slug is never read/preserved. State the implication: any manual/normalized slug differing from name-derived slug is overwritten on save. This is symptom #1's slug-rewrite cause.

    D. Sub_category handling on EDIT:
       - Read populateSubCategoryOptions() — find its definition in staff.js. Determine: does it inject the product's saved sub_category as a selectable option even when it is NOT one of the default options for that category?
       - Cross-check window.ITEM_CATEGORIES — find where it is defined (grep "ITEM_CATEGORIES"). List the allowed sub_categories per category, specifically whether "Panels" is a valid sub_category for the Panel product's category.
       - Determine the failure path: if saved sub_category ("Panels") is NOT in the dropdown options, what value does staff-product-subcategory.value resolve to on submit? (first option / blank / the invalid value). This is symptom #1's sub_category-flip cause. Explain why it lands on "Tents".

    E. Image upload for Party Decor:
       - Find uploadAllNewImages() definition. Determine which column(s) new images write to (image_url, image_urls, or both — note lines 1390-1391 write both).
       - Inspect products.js to determine which column the LIVE catalog renders Party Decor images FROM. Compare: does the live render read a different field/shape than what is saved? Consider: array vs string, image_url vs image_urls, category-specific rendering branches, or a hardcoded/local product list for Party Decor.
       - State the concrete mismatch causing symptom #3.

    For each of the 3 symptoms, end this task with a one-line "Static hypothesis" statement.
  </action>
  <verify>
    Analysis references real line numbers from staff.js/index.html/products.js. Each of the 3 symptoms has a named code location and a stated hypothesis. No files were modified (git status shows no changes to staff.js, index.html, products.js).
  </verify>
  <done>
    Field-mapping table complete with dropped/auto-overwritten fields flagged. Slug, sub_category, and image-upload behaviors documented with line references. Three static hypotheses stated.
  </done>
</task>

<task type="auto">
  <name>Task 2: Read-only DB reproduction — confirm hypotheses against live data</name>
  <files>none (Supabase read-only queries only — SELECT, never write)</files>
  <action>
    Use the Supabase MCP tools (project URL https://nsedpvrqhxcikhlieize.supabase.co) to run READ-ONLY SELECT queries. DO NOT run any INSERT, UPDATE, DELETE, or apply_migration. NO DB writes of any kind.

    1. SELECT a 3D Print product (no known corruption). Record full row: id, name, slug, category, sub_category, image_url, image_urls, sizes, colors, size_variants, price.
    2. Simulate the Edit form prefill (openStaffProductModal logic) for that row: would every field the form shows match the DB? Note any field the form cannot represent.
    3. Simulate Save-without-changes: build the productData that handleStaffProductSubmit would send, then diff vs the DB row. Flag every field that WOULD change even though the user changed nothing (expected suspects: slug, possibly image_url/image_urls ordering, sub_category, size_variants null-ing, colors).
    4. SELECT the Panel product(s) (search name/category for "Panel"). Record sub_category and slug. Apply the Task-1 sub_category dropdown analysis: confirm whether on Save the sub_category would revert (and to what) and whether slug would regenerate. Confirm symptom #1.
    5. SELECT the Black tumbler (Engraving). Record sub_category, image_url, image_urls. NOTE: per MEMORY.md, Engraving/3D-print products may be hardcoded in JS rather than Supabase. Determine: is Black tumbler a Supabase row or a hardcoded local product in products.js/staff.js? This is the likely cause of symptom #2 (portal edits a local object; live site reads a different source). Confirm with evidence.
    6. For Party Decor: SELECT a Party Decor product and inspect image_url vs image_urls. Confirm against products.js render path which column the live site uses — confirm symptom #3 mismatch.

    Replace each Task-1 "Static hypothesis" with a "Confirmed root cause" or "Disproven — revised cause" backed by the queried data.
  </action>
  <verify>
    Real row data captured for at least one 3D Print, one Panel, the Black tumbler, and one Party Decor product. Save-without-changes diff produced. Each symptom has a data-backed confirmed root cause. No write operations were issued (only SELECT queries used).
  </verify>
  <done>
    All three symptoms have confirmed root causes backed by live DB row data and the code analysis from Task 1. Zero DB rows modified.
  </done>
</task>

<task type="auto">
  <name>Task 3: Write diagnostic report to SUMMARY</name>
  <files>.planning/quick/26-diagnose-staff-portal-save-bug-silent-da/26-SUMMARY.md</files>
  <action>
    Write the complete diagnostic report. Structure:

    1. Executive summary — one paragraph: what is broken and why, at a glance.
    2. Save handler overview — handleStaffProductSubmit location, signature, flow.
    3. Field mapping table — full UI->payload mapping with DROPPED and AUTO-OVERWRITTEN flags.
    4. Symptom #1 (Panel sub_category + slug) — root cause, code lines, DB evidence.
    5. Symptom #2 (Black tumbler Wood->Metal not on live) — root cause (local vs Supabase source), evidence.
    6. Symptom #3 (Party Decor images not appearing) — root cause (column/render mismatch), evidence.
    7. Additional risks found — any other silently-dropped or auto-overwritten fields discovered (e.g. fields the form omits, size_variants null-ing, slug rewrite affecting URLs/SEO/links).
    8. Recommended fixes (description only, NOT implemented) — concise bullet per symptom for a future fix plan.

    Keep it factual and line-referenced. This is the deliverable.
  </action>
  <verify>
    26-SUMMARY.md exists, contains all 8 sections, all three symptoms have a confirmed root cause with code line references and DB evidence, and a recommended-fixes section. No code or DB rows were changed during the entire plan.
  </verify>
  <done>
    Complete diagnostic report written to 26-SUMMARY.md. User can read it and scope a fix plan without further investigation.
  </done>
</task>

</tasks>

<verification>
- staff.js, index.html, products.js unchanged (git status clean for these files)
- No Supabase write operations issued (SELECT-only)
- 26-SUMMARY.md contains field mapping + 3 confirmed root causes + recommended fixes
</verification>

<success_criteria>
- All three symptoms traced to concrete, evidence-backed root causes
- Complete UI-field-to-payload mapping with dropped/overwritten fields flagged
- Zero code changes, zero DB row changes
- Diagnostic report is self-contained and actionable for a follow-up fix
</success_criteria>

<output>
After completion, create `.planning/quick/26-diagnose-staff-portal-save-bug-silent-da/26-SUMMARY.md` (the report IS the deliverable).
</output>
