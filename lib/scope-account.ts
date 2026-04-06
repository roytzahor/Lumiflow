/**
 * Resolves `?account=` query value against the user's accounts.
 * Invalid or missing values mean "all accounts".
 */
export function parseScopeAccountId(
  accountParam: string | null,
  accounts: ReadonlyArray<{ id: string }>
): "all" | string {
  if (!accountParam) return "all";
  if (accounts.some((a) => a.id === accountParam)) return accountParam;
  return "all";
}
