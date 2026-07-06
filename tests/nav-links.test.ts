import { describe, it, expect } from "vitest";
import { MAIN_NAV_ITEMS, buildMainHref, buildNavHref, buildQuickAddHref } from "@/lib/nav-links";

describe("buildMainHref", () => {
  it("returns the bare path when no query values are set", () => {
    expect(buildMainHref("/history", {})).toBe("/history");
    expect(buildMainHref("/", { month: null, year: null, account: null })).toBe("/");
  });

  it("preserves month, year and account", () => {
    expect(buildMainHref("/history", { month: "6", year: "2026", account: "all" })).toBe(
      "/history?month=6&year=2026&account=all"
    );
  });
});

describe("buildNavHref", () => {
  const query = { month: "6", year: "2026", account: "my-money" };

  it("preserves query only for dashboard and history", () => {
    const [home, history, insights, settings] = MAIN_NAV_ITEMS;
    expect(buildNavHref(home, query)).toBe("/?month=6&year=2026&account=my-money");
    expect(buildNavHref(history, query)).toBe("/history?month=6&year=2026&account=my-money");
    expect(buildNavHref(insights, query)).toBe("/insights");
    expect(buildNavHref(settings, query)).toBe("/settings");
  });
});

describe("buildQuickAddHref", () => {
  it("opens quick add on the dashboard with preserved scope", () => {
    expect(buildQuickAddHref({ account: "a1" }, false)).toBe("/?account=a1&quickAdd=1");
  });

  it("adds recurring=1 for the recurring variant", () => {
    expect(buildQuickAddHref({}, true)).toBe("/?quickAdd=1&recurring=1");
  });
});
