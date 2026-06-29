import { describe, expect, it } from 'vitest';
import { detectCategory, detectAllCategoryMatches } from '../lib/category-dictionary';

describe('detectCategory', () => {
  it('matches a keyword contained in the description', () => {
    expect(detectCategory('קניתי בסופר')).toEqual({ name: 'סופר', icon: '🛒' });
  });

  it('is case-insensitive for latin keywords', () => {
    expect(detectCategory('WOLT order')).toEqual({ name: 'אוכל', icon: '🛵' });
  });

  it('returns null for an empty description', () => {
    expect(detectCategory('')).toBeNull();
  });

  it('returns null when no keyword matches', () => {
    expect(detectCategory('xyz123')).toBeNull();
  });

  it('returns the first matching keyword in dictionary order', () => {
    // "משכנתא" (מגורים) is defined before "חשמל" (חשבונות)
    expect(detectCategory('תשלום משכנתא וגם חשמל')).toEqual({ name: 'מגורים', icon: '🏠' });
  });
});

describe('detectAllCategoryMatches', () => {
  it('returns an empty array for a blank/whitespace description', () => {
    expect(detectAllCategoryMatches('')).toEqual([]);
    expect(detectAllCategoryMatches('   ')).toEqual([]);
  });

  it('returns an empty array when nothing matches', () => {
    expect(detectAllCategoryMatches('xyz123')).toEqual([]);
  });

  it('returns one result for a single match', () => {
    expect(detectAllCategoryMatches('קפה בבוקר')).toEqual([{ name: 'אוכל', icon: '☕' }]);
  });

  it('returns multiple distinct categories for an ambiguous description', () => {
    const result = detectAllCategoryMatches('סופר וקפה');
    expect(result.map((r) => r.name)).toEqual(['סופר', 'אוכל']);
  });

  it('deduplicates matches that resolve to the same category name', () => {
    // both "פיצה" and "בורגר" map to category "אוכל" → single result
    const result = detectAllCategoryMatches('פיצה ובורגר');
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('אוכל');
  });
});
