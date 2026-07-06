/**
 * Builds the dashboard scope segments (הכסף שלי / per-account / הכל).
 * Pure — unit-tested in tests/scope-segments.test.ts.
 */

export type ScopeSegment = {
  /** "my-money" | "all" | account id — feeds parseScopeAccountId / ?account= */
  value: string;
  label: string;
};

export type ScopeSegmentsResult =
  | { kind: "segmented"; segments: ScopeSegment[] }
  | { kind: "select" };

/** Above this count a segmented control becomes unreadable; fall back to a select. */
export const MAX_SCOPE_SEGMENTS = 4;

export function buildScopeSegments(
  accounts: ReadonlyArray<{ id: string; name: string }>,
  hasMyMoney: boolean
): ScopeSegmentsResult {
  const segments: ScopeSegment[] = [];
  if (hasMyMoney) segments.push({ value: "my-money", label: "הכסף שלי" });
  for (const account of accounts) {
    segments.push({ value: account.id, label: account.name });
  }
  segments.push({ value: "all", label: "הכל" });

  if (segments.length > MAX_SCOPE_SEGMENTS) return { kind: "select" };
  return { kind: "segmented", segments };
}
