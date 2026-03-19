# LumiFlow Error Handling Strategy

## Runtime Resilience
- `AppErrorBoundary` wraps app content and prevents full UI collapse on React runtime errors.
- `AppRuntimeGuard` listens to `error` and `unhandledrejection` browser events.
- Automatic one-time reload is triggered for recoverable asset/runtime errors (chunk/module load failures).

## Recovery Rules
- Auto-recovery executes once per tab session (`sessionStorage` key guard).
- If error repeats, user gets a clear toast and can reload manually.
- Non-recoverable runtime errors are logged to console for diagnosis.

## UX Outcomes
- Users should no longer see a blank screen without recovery action.
- Route content failures fall back to dedicated error UIs (`app/error.tsx`, route-level error files).
- Critical runtime crashes are contained and actionable via retry controls.
