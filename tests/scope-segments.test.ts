import { describe, it, expect } from "vitest";
import { buildScopeSegments, MAX_SCOPE_SEGMENTS } from "@/lib/scope-segments";

const acc = (id: string, name: string) => ({ id, name });

describe("buildScopeSegments", () => {
  it("couple with ratios: my-money first, then accounts, then all", () => {
    const result = buildScopeSegments([acc("a1", "האישי שלי"), acc("a2", "המשותף")], true);
    expect(result.kind).toBe("segmented");
    if (result.kind !== "segmented") return;
    expect(result.segments.map((s) => s.value)).toEqual(["my-money", "a1", "a2", "all"]);
    expect(result.segments[0].label).toBe("הכסף שלי");
    expect(result.segments.at(-1)?.label).toBe("הכל");
  });

  it("omits my-money when the user has no contribution ratios", () => {
    const result = buildScopeSegments([acc("a1", "אישי"), acc("a2", "משותף")], false);
    expect(result.kind).toBe("segmented");
    if (result.kind !== "segmented") return;
    expect(result.segments.map((s) => s.value)).toEqual(["a1", "a2", "all"]);
  });

  it("uses account names as segment labels", () => {
    const result = buildScopeSegments([acc("a1", "חשבון הבית")], false);
    if (result.kind !== "segmented") throw new Error("expected segmented");
    expect(result.segments[0].label).toBe("חשבון הבית");
  });

  it("falls back to select when segments exceed the maximum", () => {
    const many = [acc("a1", "א"), acc("a2", "ב"), acc("a3", "ג"), acc("a4", "ד")];
    expect(buildScopeSegments(many, true).kind).toBe("select");
    expect(buildScopeSegments(many, false).kind).toBe("select");
  });

  it("stays segmented exactly at the maximum", () => {
    const three = [acc("a1", "א"), acc("a2", "ב"), acc("a3", "ג")];
    const result = buildScopeSegments(three, true);
    // 1 (my-money) + 3 accounts + 1 (all) = 5 > max → select
    expect(result.kind).toBe("select");
    const withoutMyMoney = buildScopeSegments(three, false);
    expect(withoutMyMoney.kind).toBe("segmented");
    if (withoutMyMoney.kind === "segmented") {
      expect(withoutMyMoney.segments).toHaveLength(MAX_SCOPE_SEGMENTS);
    }
  });

  it("solo user without ratios still gets a well-formed list (visibility is gated by the caller)", () => {
    const result = buildScopeSegments([acc("a1", "האישי שלי")], false);
    if (result.kind !== "segmented") throw new Error("expected segmented");
    expect(result.segments.map((s) => s.value)).toEqual(["a1", "all"]);
  });
});
