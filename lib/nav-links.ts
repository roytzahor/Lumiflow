/**
 * Shared main-navigation link building for BottomNav (mobile) and DesktopSidebar (lg+).
 * Pure — unit-tested in tests/nav-links.test.ts. Icons stay in the components.
 */

export type MainNavQuery = {
  month?: string | null;
  year?: string | null;
  account?: string | null;
};

export type MainNavItem = {
  name: string;
  basePath: string;
  /** Only the dashboard and history carry month/year/account across navigation. */
  preservesQuery: boolean;
};

export const MAIN_NAV_ITEMS: readonly MainNavItem[] = [
  { name: "סקירה", basePath: "/", preservesQuery: true },
  { name: "היסטוריה", basePath: "/history", preservesQuery: true },
  { name: "תובנות", basePath: "/insights", preservesQuery: false },
  { name: "הגדרות", basePath: "/settings", preservesQuery: false },
];

function appendScopeParams(params: URLSearchParams, query: MainNavQuery): void {
  if (query.month) params.set("month", query.month);
  if (query.year) params.set("year", query.year);
  if (query.account) params.set("account", query.account);
}

export function buildMainHref(basePath: string, query: MainNavQuery): string {
  const params = new URLSearchParams();
  appendScopeParams(params, query);
  const q = params.toString();
  return q ? `${basePath}?${q}` : basePath;
}

export function buildNavHref(item: MainNavItem, query: MainNavQuery): string {
  return item.preservesQuery ? buildMainHref(item.basePath, query) : item.basePath;
}

/** Href that opens the Quick Add sheet on the dashboard, preserving the current scope. */
export function buildQuickAddHref(query: MainNavQuery, recurring: boolean): string {
  const params = new URLSearchParams();
  appendScopeParams(params, query);
  params.set("quickAdd", "1");
  if (recurring) params.set("recurring", "1");
  return `/?${params.toString()}`;
}
