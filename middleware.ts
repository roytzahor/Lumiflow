export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/', '/history', '/insights', '/settings', '/welcome', '/onboarding', '/api/invite/:path*'],
};
