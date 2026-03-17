import { createHash } from 'crypto';

export function hashInviteToken(rawToken: string) {
  return createHash('sha256').update(rawToken).digest('hex');
}
