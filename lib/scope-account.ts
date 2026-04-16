/**
 * Resolves `?account=` query value against the user's accounts.
 * Invalid or missing values mean "all accounts".
 * The special value "my-money" is passed through as-is.
 */
export function parseScopeAccountId(
  accountParam: string | null,
  accounts: ReadonlyArray<{ id: string }>
): "all" | "my-money" | string {
  if (!accountParam) return "all";
  if (accountParam === "my-money") return "my-money";
  if (accounts.some((a) => a.id === accountParam)) return accountParam;
  return "all";
}
