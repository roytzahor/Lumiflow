import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

const DEFAULT_CATEGORIES = [
  { name: 'כללי', icon: '✨', type: 'expense' },
  { name: 'מזון', icon: '🍽️', type: 'expense' },
  { name: 'דיור', icon: '🏠', type: 'expense' },
  { name: 'תחבורה', icon: '🚗', type: 'expense' },
  { name: 'בילויים', icon: '🎉', type: 'expense' },
];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body?.email ?? '').trim().toLowerCase();
    const password = String(body?.password ?? '').trim();
    const name = String(body?.name ?? '').trim();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name: name || null,
          passwordHash,
          onboardingCompletedAt: null,
          themePreference: 'SYSTEM',
          isPremiumMock: false,
        },
      });

      await tx.budgetSettings.create({
        data: {
          userId: user.id,
          monthlyIncome: 0,
          needsPercent: 50,
          wantsPercent: 30,
          savingsPercent: 20,
        },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          userId: user.id,
          isCustom: false,
        })),
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Registration failed', error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: 'User already exists' }, { status: 409 });
      }
      if (error.code === 'P2021' || error.code === 'P2022') {
        return NextResponse.json(
          { error: 'Database schema is outdated. Run prisma migrate deploy on production DB.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
