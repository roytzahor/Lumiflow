import { cache } from 'react';
import { getServerSession } from 'next-auth';
import type { Session } from 'next-auth';
import { authOptions } from '@/auth';

/** One NextAuth session resolution per RSC request (layout + loaders + guards). */
export const getCachedServerSession = cache((): Promise<Session | null> => getServerSession(authOptions));
