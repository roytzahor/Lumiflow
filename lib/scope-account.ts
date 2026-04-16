export type ScopeAccountParseOptions = {
  /** When the query has no `account` param, use this scope instead of "all". */
  defaultWhenUnset?: "all" | "my-money";
};

/**
 * Resolves `?account=` query value against the user's accounts.
 * Special values: `my-money`, `all` (explicit all accounts).
 * Invalid UUIDs fall back to "all".
 */
export function parseScopeAccountId(
  accountParam: string | null,
  accounts: ReadonlyArray<{ id: string }>,
  opts?: ScopeAccountParseOptions
): "all" | "my-money" | string {
  if (!accountParam) return opts?.defaultWhenUnset ?? "all";
  if (accountParam === "all") return "all";
  if (accountParam === "my-money") return "my-money";
  if (accounts.some((a) => a.id === accountParam)) return accountParam;
  return "all";
}
