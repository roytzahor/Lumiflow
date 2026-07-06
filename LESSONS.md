# LESSONS.md — Self-Correction Log

Protocol (CLAUDE.md, Autonomy Rules §2): when a test fails, a build breaks, or an architectural
assumption is proven wrong — **stop**, document the mistake, the root cause, and the preventive
rule here, and only then attempt the fix. Read this file at the start of every session.

Entry format: `## <date> — <title>` with **Mistake / Root cause / Rule**.

---

## 2026-07-04 — Barrel-retirement importer census missed dynamic imports and undercounted by half
- **Mistake:** The Phase 2 plan inventoried "7+ importers" of the legacy `app/actions.ts` barrel
  from a static-import grep. The real count was 16 files with static imports plus 3 dynamic
  `await import('@/app/actions')` call sites (`QuickAddSheet.tsx` ×2, `RecurringEditSheet.tsx` ×1)
  that the `from ['"]...` pattern can never match. Had the barrel been deleted on the planned
  list alone, the build would have broken.
- **Root cause:** Grepping only for `from '...'`-style module specifiers; dynamic `import(...)`
  expressions use the specifier without `from`, so they are invisible to that pattern.
- **Rule:** Before deleting any module, sweep for the bare specifier itself (e.g.
  `grep -rn "app/actions['\"\`]"`) — not just `from`-clauses — and only delete when the bare-
  specifier sweep returns zero hits. Verify with `tsc --noEmit` *and* `yarn build` (bundler
  resolution catches what the type-checker's cache can miss).

## 2026-07-04 — Full-suite E2E against `next dev` flakes under load; verify against a production build
- **Mistake:** Chased one-off failures (signin page-load timeout, settings profile-save latency,
  Quick Add sheet-open timeout) across otherwise-green ~5-minute dev-mode suite runs as if they
  were regressions. The failing test was different in every run and passed in isolation each time.
- **Root cause:** `next dev` on-demand compilation and HMR overhead make page loads and server
  actions intermittently slow when 20 tests run back-to-back. A production build
  (`yarn build && yarn start`, local `DATABASE_URL`) runs the same suite in ~90s with stable
  timing — 19/19 green, the only exclusion being the `?dashboardFail=1` retry test, which is
  `NODE_ENV !== "production"`-gated by design (`app/dashboard-data-loader.tsx`).
- **Rule:** For suite-level green/red verdicts, run Cypress against a production build; use the
  dev-mode script for the dev-only failure-injection test and for iterating on a single spec.
  Before treating any one-off dev-mode failure as a regression, re-run it in isolation.

## 2026-07-04 — S7-7 save banner can get stuck invisible: AnimatePresence exit vs. router.refresh()
- **Mistake:** The Quick Add save-success banner is removed via `setTimeout(750)` +
  `AnimatePresence` exit. In full-suite runs it intermittently stayed mounted at `opacity: 0`
  for 20+ seconds (screenshot shows a phantom gap above the sheet header), which also broke the
  `₪500` assertion in `quick-add.cy.ts`. A dedicated diagnostic spec against a light dashboard
  could not reproduce it.
- **Root cause:** `handleSubmit` calls `router.refresh()` right before scheduling the banner
  dismissal. When the RSC re-render commits during the exit-animation window (likelier with a
  heavy dashboard payload), framer-motion's `onExitComplete`-driven unmount is dropped — the
  element finishes animating to `opacity: 0` but is never removed from the DOM.
- **Rule:** Never gate the *removal* of an element on an AnimatePresence exit callback when a
  `router.refresh()` / RSC commit can land mid-exit. Auto-dismissing transients owned by a
  timer must unmount via plain conditional rendering (entrance animation only), or via the
  toast system.
- **Mistake:** A new E2E test clicked `[data-testid="fab-add-button"]` right after
  `signUpThroughWelcome` lands on `/`; the click fired before React hydration attached the
  onClick handler, so the Quick Add sheet never opened and the test timed out. Three sibling
  tests with the identical pattern passed in the same run — it's a timing flake, not a
  deterministic failure.
- **Root cause:** `signUpThroughWelcome` only asserts the URL; the dashboard DOM is server-
  rendered and visible before hydration completes, so element visibility does not imply
  interactivity.
- **Rule:** Never follow a navigation assertion directly with a click on a client-handler
  element. Open the Quick Add sheet only via the `openQuickAddSheet()` helper
  (`cypress/support/lumiflow-helpers.ts`), which verifies the sheet actually opened and
  retries the click once after a grace period.

## 2026-07-06 — "Local" E2E scripts ran dev mode; a false bisect blamed a phase that was innocent
- **Mistake:** Chased two full-suite failures (settings profile-save, quick-add dirty-guard) as a
  desktop-shell regression, including a git-stash bisect whose "baseline" also failed — because
  BOTH `scripts/cypress-e2e-local.sh` and `scripts/cypress-e2e-spec-local.sh` run `yarn dev`,
  the exact mode the 2026-07-04 entry says produces roaming timing flakes. The 2026-07-04 rule
  ("suite verdicts on a production build") was never encoded in a script, so it was silently
  violated by every scripted run.
- **Root cause:** The prescribed verification method existed only as prose in LESSONS.md; the
  convenient scripts did something else. Under dev-mode load, the failing test changes from run
  to run (comma → dirty-guard → installment-preview/history-search), which makes any single run
  look like a regression bisect signal when it is noise.
- **Rule:** Use `scripts/cypress-e2e-prod-local.sh` (added today: build + `next start` + full
  suite, `CYPRESS_PROD_BUILD=1` skips the dev-only failure-injection test) for every suite-level
  verdict. Never bisect on a dev-mode run. A bisect where the baseline fails the same way as the
  candidate means the harness, not the code, is the variable — verify the harness first.
  `openQuickAddSheet()` now retries the FAB click up to 4× until the sheet dialog mounts.

## 2026-07-06 — Stale `next start` on :3000 + in-place rebuild produced phantom "regressions"
- **Mistake:** A leftover production server (from a manual visual check; killed with a bad
  `pkill -f "next-server\|next start"` pattern that matched nothing) stayed on port 3000. The
  next scripted run rebuilt `.next` UNDER that live server, and `start-server-and-test` silently
  reused it — history specs then failed on the page's error boundary ("לא הצלחנו לטעון את
  ההיסטוריה") and looked exactly like a code regression from the phase under test.
- **Root cause:** Two compounding traps: (1) `start-server-and-test` reuses any process already
  answering on the target port; (2) `yarn build` swaps `.next` while an old `next start` process
  serves from it, yielding chunk/RSC mismatches and server-side loader errors.
- **Rule:** Before any suite run or after any manual server session, free port 3000 by PID:
  `for pid in $(lsof -nP -t -iTCP:3000 -sTCP:LISTEN); do kill $pid; done` — never trust
  `pkill -f` patterns. `scripts/cypress-e2e-prod-local.sh` now does this automatically before
  building. An error-boundary screenshot in E2E means "check the server process/build first",
  not "bisect the diff".

## 2026-07-06 — S7-7 banner assertion still flakes under full-suite load (recurrence, no regression)
- **Mistake / observation:** In a full-suite production-build run, `quick-add.cy.ts` "normalises a
  comma decimal amount" failed on `quickadd-save-success` never becoming visible, while the form
  did reset (save succeeded). Spec passes 4/4 in isolation; the change under test (dashboard scope
  segmented control) does not touch QuickAddSheet.
- **Root cause:** The success banner's ~750ms visibility window is suite-load sensitive — same
  surface as the 2026-07-04 AnimatePresence entry, different symptom (missed window vs. stuck exit).
- **Rule:** Treat a solo failure of this assertion in full-suite runs as the known flake after one
  green isolated re-run; only investigate as a regression if it fails in isolation or alongside
  other QuickAdd failures. Longer-term fix candidate: assert on the transaction row instead of the
  transient banner, or lengthen the banner window under Cypress.

## 2026-07-04 — Sprint 7 UI changes shipped without updating the E2E specs that assert those surfaces
- **Mistake:** Phase 1 baseline run (10/14 passing) showed 4 failures caused by Sprint 7 itself:
  1. `insights.cy.ts` ×3 — S7-9 gates the whole Insights body behind budget setup, but all three
     specs sign up fresh users (no budget) and assert the pre-Sprint-7 anomaly section
     (`שינויים בולטים החודש`, example cards), which now never renders for them.
  2. `history.cy.ts` ×1 — `quickadd-submit` click failed with "center of this element is hidden
     from view": the spec clicks without scrolling inside the sheet's inner overflow container,
     and the Sprint 7 sheet is taller (installments card copy + preview). The passing
     `quick-add.cy.ts` already uses `.scrollIntoView().click({ force: true })`. Downstream, the
     same spec asserts TransactionFeed's `לא נוספו עדיין הוצאות`, which HistoryView's new S7-8
     empty state (`אין הוצאות החודש`) now supersedes on the history page.
- **Root cause:** Features that change user-visible copy/branches landed with unit tests only;
  the E2E suite was already red for environmental reasons (broken remote DB in `.env`), so spec
  drift was invisible. The 19 Jun-29/30 failure screenshots were environmental — with the local
  DB script, 5 of the 9 previously-failing specs pass unchanged.
- **Rule:** A change to user-visible copy or a rendering branch must update the E2E specs that
  assert that surface *in the same commit*. Run E2E via `scripts/cypress-e2e-local.sh` so a
  broken `.env` can never mask drift. Inside the Quick Add sheet, always
  `.scrollIntoView().click({ force: true })` on elements in the inner scroll container.

## 2026-07-04 — Sprint 7 landed as a large uncommitted tree with a red E2E suite
- **Mistake:** All ten Sprint 7 features were implemented in the working tree with no new tests
  and no commits, while `cypress/screenshots/` accumulated 19 `(failed)` screenshots (Jun 29–30)
  across all 9 specs — making it impossible to tell real regressions from environment failures.
- **Root cause:** Feature work outpaced verification; `cypress/screenshots/` and
  `repomix-output.xml` were not gitignored, and there was no commit-per-domain discipline or
  LESSONS.md gate to force a stop.
- **Rule:** Never start a new feature domain while the working tree holds uncommitted work or a
  test suite is red. Land each domain as its own commit with its tests in the same commit.
  Diagnose and log every E2E failure root cause here *before* fixing it.
