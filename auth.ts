import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';

const socialProviders: NextAuthOptions['providers'] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  socialProviders.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/auth/signin',
  },
  providers: [
    ...socialProviders,
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user?.passwordHash) return null;
        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();
      if (!email) return false;

      await prisma.user.upsert({
        where: { email },
        update: {
          name: user.name ?? undefined,
        },
        create: {
          email,
          name: user.name ?? null,
          passwordHash: '',
          onboardingCompletedAt: null,
          themePreference: 'SYSTEM',
        },
      });

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({ where: { email: user.email.toLowerCase() } });
        if (dbUser) token.sub = dbUser.id;
      } else if (user) {
        token.sub = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
