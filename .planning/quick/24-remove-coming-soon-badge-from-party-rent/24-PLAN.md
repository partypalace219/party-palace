---
phase: quick-24
plan: 24
type: execute
wave: 1
depends_on: []
files_modified: [index.html]
autonomous: true

must_haves:
  truths:
    - "Party Rentals nav link no longer displays a COMING SOON badge (desktop nav)"
    - "Party Rentals nav link no longer displays a COMING SOON badge (mobile nav)"
    - "Party Rentals nav link is still present and clickable in both navs"
  artifacts:
    - path: "index.html"
      provides: "Navigation markup without COMING SOON badge"
      contains: "navigate('partyrentals')"
  key_links:
    - from: "index.html nav button"
      to: "navigate('partyrentals')"
      via: "onclick handler preserved"
      pattern: "navigate\\('partyrentals'\\)"
---

<objective>
Remove the misleading "COMING SOON" badge from the Party Rentals navigation links in index.html. The Party Rentals section is fully functional (chairs, tables, tents, panels are all rentable), so the badge placed during early development is now inaccurate.

Purpose: Stop displaying inaccurate "Coming Soon" messaging on a live, fully-functional section.
Output: Updated index.html with badge removed from both desktop and mobile nav, cache-bust versions bumped.
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/sammy/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

# Target file (badge appears at lines 155 and 238)
@index.html
</context>

<tasks>

<task type="auto">
  <name>Task 1: Remove COMING SOON badge from both nav links and bump cache-bust</name>
  <files>index.html</files>
  <action>
    There are TWO Party Rentals nav buttons with the badge — desktop nav (~line 155) and mobile nav (~line 238). Both currently read:

    `<button onclick="navigate('partyrentals')" data-page="partyrentals" class="coming-soon-tab">Party Rentals <span class="coming-soon-badge">Coming Soon</span></button>`

    For BOTH occurrences:
    1. Delete the `<span class="coming-soon-badge">Coming Soon</span>` element entirely (including the leading space before it).
    2. Remove the `class="coming-soon-tab"` attribute from the button (this class only styled the badge container — confirm via grep it is not used elsewhere; if it IS used elsewhere, leave the class but still remove the span).
    3. Result should be: `<button onclick="navigate('partyrentals')" data-page="partyrentals">Party Rentals</button>`

    Do NOT modify the `onclick="navigate('partyrentals')"` handler or the `data-page="partyrentals"` attribute.
    Do NOT touch any other nav items.

    Then bump cache-bust versions on the modified file's references in index.html:
    - Line 121: `styles.css?v=2026-05-21-1` -> `styles.css?v=2026-06-03-24`
    - Line 2360: `ui.js?v=2026-05-25-22` -> `ui.js?v=2026-06-03-24`
  </action>
  <verify>
    - grep -i "COMING SOON" index.html returns NO matches
    - grep "navigate('partyrentals')" index.html returns 2 matches (desktop + mobile nav buttons intact)
    - grep "v=2026-06-03-24" index.html returns 2 matches (css + js bumped)
  </verify>
  <done>Both COMING SOON badges removed, both Party Rentals nav buttons still present with working onclick handlers, cache-bust versions bumped on styles.css and ui.js.</done>
</task>

</tasks>

<verification>
- No "COMING SOON" text remains anywhere in index.html (case-insensitive)
- Both Party Rentals nav buttons render plain text "Party Rentals" and retain navigate('partyrentals') onclick
- styles.css and ui.js cache-bust versions updated
</verification>

<success_criteria>
Party Rentals nav links in both desktop and mobile navs display without the COMING SOON badge, remain clickable, and cache-bust versions are bumped so users see the updated styling.
</success_criteria>

<output>
After completion, create `.planning/quick/24-remove-coming-soon-badge-from-party-rent/24-SUMMARY.md`
</output>
