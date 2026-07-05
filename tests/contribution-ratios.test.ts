import { describe, expect, it } from 'vitest';
import {
  computeMemberContributionRatios,
  computeMyContributionRatios,
} from '../lib/contribution-ratios';

describe('computeMyContributionRatios', () => {
  it('returns only the given user’s plans, with ratios against each account total', () => {
    const result = computeMyContributionRatios(
      [
        { userId: 'roy', accountId: 'shared', monthlyAmount: 6000 },
        { userId: 'dana', accountId: 'shared', monthlyAmount: 4000 },
        { userId: 'roy', accountId: 'private', monthlyAmount: 2000 },
        { userId: 'dana', accountId: 'dana-private', monthlyAmount: 3000 },
      ],
      'roy'
    );

    expect(result).toEqual([
      { accountId: 'shared', myAmount: 6000, totalAmount: 10000, ratio: 0.6 },
      { accountId: 'private', myAmount: 2000, totalAmount: 2000, ratio: 1 },
    ]);
  });

  it('falls back to ratio 1 when the account total is 0 (full attribution, like the ?? 1 fallback)', () => {
    const result = computeMyContributionRatios(
      [
        { userId: 'roy', accountId: 'shared', monthlyAmount: 0 },
        { userId: 'dana', accountId: 'shared', monthlyAmount: 0 },
      ],
      'roy'
    );

    expect(result).toEqual([{ accountId: 'shared', myAmount: 0, totalAmount: 0, ratio: 1 }]);
  });

  it('returns [] when the user has no plans, even if others do', () => {
    const result = computeMyContributionRatios(
      [{ userId: 'dana', accountId: 'shared', monthlyAmount: 4000 }],
      'roy'
    );

    expect(result).toEqual([]);
  });

  it('returns [] for empty plans', () => {
    expect(computeMyContributionRatios([], 'roy')).toEqual([]);
  });

  it('sums duplicate rows per account into the total', () => {
    // Three members: roy 1, dana 2, omer 4 → roy's ratio is 1/7
    const result = computeMyContributionRatios(
      [
        { userId: 'roy', accountId: 'shared', monthlyAmount: 1000 },
        { userId: 'dana', accountId: 'shared', monthlyAmount: 2000 },
        { userId: 'omer', accountId: 'shared', monthlyAmount: 4000 },
      ],
      'roy'
    );

    expect(result).toHaveLength(1);
    expect(result[0].totalAmount).toBe(7000);
    expect(result[0].ratio).toBeCloseTo(1 / 7, 12);
  });
});

describe('computeMemberContributionRatios', () => {
  it('assigns each member monthlyAmount / account total, preserving input order', () => {
    const result = computeMemberContributionRatios([
      { userId: 'roy', name: 'Roy', monthlyAmount: 6000 },
      { userId: 'dana', name: 'Dana', monthlyAmount: 4000 },
    ]);

    expect(result).toEqual([
      { userId: 'roy', name: 'Roy', monthlyAmount: 6000, ratio: 0.6 },
      { userId: 'dana', name: 'Dana', monthlyAmount: 4000, ratio: 0.4 },
    ]);
  });

  it('gives a single member ratio 1', () => {
    const result = computeMemberContributionRatios([
      { userId: 'roy', name: 'Roy', monthlyAmount: 500 },
    ]);

    expect(result).toEqual([{ userId: 'roy', name: 'Roy', monthlyAmount: 500, ratio: 1 }]);
  });

  it('gives every member ratio 0 when the account total is 0 (unlike the my-ratio fallback of 1)', () => {
    const result = computeMemberContributionRatios([
      { userId: 'roy', name: 'Roy', monthlyAmount: 0 },
      { userId: 'dana', name: 'Dana', monthlyAmount: 0 },
    ]);

    expect(result.map((m) => m.ratio)).toEqual([0, 0]);
  });

  it('returns [] for no members', () => {
    expect(computeMemberContributionRatios([])).toEqual([]);
  });

  it('ratios always sum to 1 when the total is positive (integer ILS pledges)', () => {
    const pledgeSets = [
      [1, 1, 1],
      [6000, 4000],
      [1, 2, 4],
      [333, 333, 334],
      [1, 9999],
      [50, 30, 20],
    ];

    for (const pledges of pledgeSets) {
      const result = computeMemberContributionRatios(
        pledges.map((monthlyAmount, i) => ({ userId: `u${i}`, name: `U${i}`, monthlyAmount }))
      );
      const ratioSum = result.reduce((sum, m) => sum + m.ratio, 0);
      expect(ratioSum).toBeCloseTo(1, 12);
      for (const m of result) {
        expect(m.ratio).toBeGreaterThanOrEqual(0);
        expect(m.ratio).toBeLessThanOrEqual(1);
      }
    }
  });
});
