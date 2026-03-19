import { beforeEach, describe, expect, it, vi } from 'vitest';

const { findUnique, create } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique,
      create,
    },
  },
}));

import { resolveOrRestoreSessionUserId } from '../lib/session-user';

describe('resolveOrRestoreSessionUserId', () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
  });

  it('returns session user id when the user exists', async () => {
    findUnique.mockResolvedValueOnce({ id: 'user-1' });

    const userId = await resolveOrRestoreSessionUserId({
      userId: 'user-1',
      email: 'user@example.com',
    });

    expect(userId).toBe('user-1');
    expect(create).not.toHaveBeenCalled();
  });

  it('falls back to existing user by email when id is stale', async () => {
    findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'user-2' });

    const userId = await resolveOrRestoreSessionUserId({
      userId: 'missing-id',
      email: 'user2@example.com',
      name: 'User Two',
    });

    expect(userId).toBe('user-2');
    expect(create).not.toHaveBeenCalled();
  });

  it('creates a restored user when id and email do not exist', async () => {
    findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    create.mockResolvedValueOnce({ id: 'restored-1' });

    const userId = await resolveOrRestoreSessionUserId({
      userId: 'missing-id',
      email: 'restored@example.com',
      name: 'Restored User',
    });

    expect(userId).toBe('restored-1');
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('throws when session has no id and no email', async () => {
    await expect(resolveOrRestoreSessionUserId({ userId: null, email: null })).rejects.toThrow(
      'Unauthorized: stale session user'
    );
  });
});
