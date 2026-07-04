# LESSONS.md — Self-Correction Log

Protocol (CLAUDE.md, Autonomy Rules §2): when a test fails, a build breaks, or an architectural
assumption is proven wrong — **stop**, document the mistake, the root cause, and the preventive
rule here, and only then attempt the fix. Read this file at the start of every session.

Entry format: `## <date> — <title>` with **Mistake / Root cause / Rule**.

---

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
