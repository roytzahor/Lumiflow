export { default } from 'next-auth/middleware';

export const config = {
  matcher: ['/', '/history', '/settings', '/onboarding', '/api/invite/:path*'],
};
