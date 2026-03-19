export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/', '/history', '/insights', '/settings', '/onboarding', '/api/invite/:path*'],
};
