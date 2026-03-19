import { prisma } from '@/lib/prisma';
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
    const user = await prisma.user.create({
      data: {
        email,
        name: name || null,
        passwordHash,
        onboardingCompletedAt: null,
      },
    });

    await prisma.budgetSettings.create({
      data: {
        userId: user.id,
        monthlyIncome: 0,
        needsPercent: 50,
        wantsPercent: 30,
        savingsPercent: 20,
      },
    });

    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId: user.id,
        isCustom: false,
      })),
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
