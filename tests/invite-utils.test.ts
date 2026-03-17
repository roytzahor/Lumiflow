import { describe, expect, it } from 'vitest';
import { hashInviteToken } from '../lib/invite-utils';

describe('hashInviteToken', () => {
  it('creates deterministic hash for same token', () => {
    const a = hashInviteToken('abc123');
    const b = hashInviteToken('abc123');
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('creates different hashes for different tokens', () => {
    const a = hashInviteToken('abc123');
    const b = hashInviteToken('abc124');
    expect(a).not.toBe(b);
  });
});
