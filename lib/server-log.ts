/** Structured dev logging for swallowed server errors (no PII by default). */
export function logServerDev(code: string, error: unknown): void {
  if (process.env.NODE_ENV === 'production') return;
  const message = error instanceof Error ? error.stack ?? error.message : String(error);
  console.error(`[lumiflow:${code}]`, message);
}
