---
phase: quick-16
plan: 16
type: execute
wave: 1
depends_on: []
files_modified:
  - index.html
  - party-palace-logo.png
  - party-palace-logo.jpeg
autonomous: true

must_haves:
  truths:
    - "Header logo loads as PNG with transparent background on production"
    - "Old JPEG logo is fully removed from the repository"
    - "Cache-bust query string forces browsers to fetch the new asset (v4)"
  artifacts:
    - path: "index.html"
      provides: "Updated <img> tag referencing PNG with ?v=4"
      contains: 'party-palace-logo.png?v=4'
    - path: "party-palace-logo.png"
      provides: "New transparent-background logo, tracked in git"
  key_links:
    - from: "index.html"
      to: "party-palace-logo.png"
      via: "<img src=\"party-palace-logo.png?v=4\">"
      pattern: 'party-palace-logo\\.png\\?v=4'
---

<objective>
Replace the header logo asset from JPEG to PNG (transparent background) and bump the cache-bust query to v4 so production browsers fetch the new file.

Purpose: Header currently shows JPEG with white/opaque background, breaking the visual on the gradient header. PNG with transparency restores design intent.
Output: Updated index.html, PNG tracked in git, JPEG removed, commit pushed for Vercel auto-deploy.
</objective>

<execution_context>
@C:/Users/sammy/.claude/get-shit-done/workflows/execute-plan.md
</execution_context>

<context>
@index.html

Current state (verified):
- index.html line 160: `<img src="party-palace-logo.jpeg?v=3" alt="Party Palace" class="logo-img">`
- party-palace-logo.png exists on disk but is UNTRACKED (per git status)
- party-palace-logo.jpeg is already DELETED from disk (per git status `D`), but the deletion is unstaged
- Prior task (quick-15) already bumped JPEG to v3; this task migrates to PNG at v4
</context>

<tasks>

<task type="auto">
  <name>Task 1: Update header img tag to PNG with v=4 cache-bust</name>
  <files>index.html</files>
  <action>
    Edit index.html line ~160. Change:
      `<img src="party-palace-logo.jpeg?v=3" alt="Party Palace" class="logo-img">`
    To:
      `<img src="party-palace-logo.png?v=4" alt="Party Palace" class="logo-img">`

    Only the src attribute changes — extension from `.jpeg` to `.png` and query from `?v=3` to `?v=4`. Keep alt and class identical.

    Do NOT touch other logo references (e.g., favicon links, og:image meta) — this task is scoped strictly to the visible header img.
  </action>
  <verify>
    Grep `party-palace-logo` in index.html. Header img line must show `party-palace-logo.png?v=4`. No remaining `party-palace-logo.jpeg` references in header markup.
  </verify>
  <done>index.html header img references party-palace-logo.png?v=4.</done>
</task>

<task type="auto">
  <name>Task 2: Track PNG, stage JPEG deletion, commit, push</name>
  <files>party-palace-logo.png, party-palace-logo.jpeg, index.html</files>
  <action>
    1. Stage the new PNG explicitly: `git add party-palace-logo.png`
    2. Stage the JPEG deletion: `git add -u party-palace-logo.jpeg` (or `git rm party-palace-logo.jpeg` if -u doesn't pick it up cleanly).
    3. Stage index.html: `git add index.html`
    4. Verify `git status` shows: new file party-palace-logo.png, deleted party-palace-logo.jpeg, modified index.html — and nothing else unexpected (do not include unrelated working-tree changes like .env, .claude/settings.local.json, or other quick-task .planning files).
    5. Commit with HEREDOC message:
       ```
       feat(quick-16): swap header logo to transparent PNG (v4 cache-bust)

       - Replace party-palace-logo.jpeg with party-palace-logo.png in header
       - Bump cache-bust query from ?v=3 to ?v=4
       - Remove obsolete JPEG asset from repo

       Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
       ```
    6. Push to origin/main: `git push origin main`

    Notes:
    - Use `git add <specific paths>` only, NOT `git add .` or `git add -A` — the working tree has unrelated modified/untracked files that must not be included in this commit.
    - If push fails on hooks, fix the underlying issue and create a NEW commit (do not amend).
  </action>
  <verify>
    `git log -1 --stat` shows the three intended changes (png added, jpeg deleted, index.html modified) and nothing else. `git status` no longer lists party-palace-logo.png as untracked or party-palace-logo.jpeg as deleted. `git push` reports successful push to origin/main.
  </verify>
  <done>Commit pushed to origin/main containing exactly: PNG added, JPEG removed, index.html updated. Vercel deploy triggered.</done>
</task>

</tasks>

<verification>
- index.html header img tag references `party-palace-logo.png?v=4`
- `party-palace-logo.png` is tracked in git
- `party-palace-logo.jpeg` is no longer in the repo (deleted and committed)
- Commit pushed to origin/main
- After Vercel deploys, https://thepartypalace.in/ header shows the transparent PNG logo
</verification>

<success_criteria>
- Single commit on main contains: png added + jpeg deleted + index.html src updated to `png?v=4`
- No unrelated files included in the commit
- `git ls-files | grep party-palace-logo` lists only the .png (not .jpeg)
- Production site (after Vercel build) serves party-palace-logo.png?v=4 in the header
</success_criteria>

<output>
After completion, create `.planning/quick/16-update-header-logo-from-jpeg-to-png-with/16-SUMMARY.md` capturing: commit SHA, files changed, verification result.
</output>
