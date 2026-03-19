const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: 'כללי', icon: '✨', type: 'expense' },
  { name: 'מזון', icon: '🍽️', type: 'expense' },
  { name: 'דיור', icon: '🏠', type: 'expense' },
  { name: 'תחבורה', icon: '🚗', type: 'expense' },
  { name: 'בילויים', icon: '🎉', type: 'expense' },
  { name: 'בריאות', icon: '💊', type: 'expense' },
  { name: 'קניות', icon: '🛒', type: 'expense' },
];

function utcDate(daysAgo, hour = 9) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, hour, 0, 0, 0));
}

async function ensureAccountForUser(userId, name, type) {
  const account = await prisma.account.create({
    data: {
      name,
      type,
      balance: 0,
    },
  });

  await prisma.accountMember.create({
    data: {
      userId,
      accountId: account.id,
      role: 'OWNER',
    },
  });

  return account;
}

async function ensureBaseData(user) {
  await prisma.budgetSettings.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      monthlyIncome: 23000,
      needsPercent: 50,
      wantsPercent: 30,
      savingsPercent: 20,
      savingsGoal: 'חופשה משפחתית',
      savingsGoalAmount: 18000,
    },
    update: {
      monthlyIncome: 23000,
      needsPercent: 50,
      wantsPercent: 30,
      savingsPercent: 20,
      savingsGoal: 'חופשה משפחתית',
      savingsGoalAmount: 18000,
    },
  });

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: category.name } },
      create: { ...category, isCustom: false, userId: user.id },
      update: {},
    });
  }

  const memberships = await prisma.accountMember.findMany({
    where: { userId: user.id, account: { isArchived: false } },
    include: { account: true },
  });

  const privateAccount = memberships.find((m) => m.account.type === 'PRIVATE')?.account
    ?? await ensureAccountForUser(user.id, 'החשבון האישי שלי', 'PRIVATE');
  const sharedAccount = memberships.find((m) => m.account.type === 'SHARED')?.account
    ?? await ensureAccountForUser(user.id, 'ניהול בית משותף', 'SHARED');

  await prisma.accountContributionPlan.upsert({
    where: { userId_accountId: { userId: user.id, accountId: sharedAccount.id } },
    create: { userId: user.id, accountId: sharedAccount.id, monthlyAmount: 8500 },
    update: { monthlyAmount: 8500 },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingCompletedAt: new Date() },
  });

  return { privateAccount, sharedAccount };
}

async function clearPreviousDemo(accountIds) {
  await prisma.transaction.deleteMany({
    where: {
      accountId: { in: accountIds },
      description: { startsWith: '[DEMO]' },
    },
  });

  await prisma.recurringTransaction.deleteMany({
    where: {
      accountId: { in: accountIds },
      description: { startsWith: '[DEMO]' },
    },
  });
}

async function seedTransactions(user, privateAccount, sharedAccount) {
  const templates = [
    { amount: 68, category: 'מזון', description: '[DEMO] קפה ומאפה', account: privateAccount },
    { amount: 420, category: 'קניות', description: '[DEMO] קניות סופר שבועיות', account: sharedAccount },
    { amount: 250, category: 'תחבורה', description: '[DEMO] דלק לרכב', account: sharedAccount },
    { amount: 92, category: 'בילויים', description: '[DEMO] סרט זוגי', account: sharedAccount },
    { amount: 130, category: 'בריאות', description: '[DEMO] בית מרקחת', account: privateAccount },
    { amount: 180, category: 'מזון', description: '[DEMO] משלוח ערב', account: privateAccount },
    { amount: 315, category: 'דיור', description: '[DEMO] קניית ציוד לבית', account: sharedAccount },
  ];

  const rows = [];
  for (let i = 0; i < 54; i += 1) {
    const base = templates[i % templates.length];
    const variance = ((i % 5) - 2) * 9;
    rows.push({
      amount: Math.max(25, base.amount + variance),
      category: base.category,
      description: base.description,
      date: utcDate(i, (i % 10) + 8),
      accountId: base.account.id,
      paidByUserId: user.id,
      attributedToUserId: user.id,
    });
  }

  for (const row of rows) {
    await prisma.transaction.create({ data: row });
  }
}

async function seedRecurring(user, privateAccount, sharedAccount) {
  const start = utcDate(45);
  const recurring = [
    { accountId: sharedAccount.id, amount: 5200, category: 'דיור', description: '[DEMO] שכירות', dayOfMonth: 1 },
    { accountId: sharedAccount.id, amount: 430, category: 'חשבונות', description: '[DEMO] חשמל ומים', dayOfMonth: 12 },
    { accountId: privateAccount.id, amount: 59, category: 'בילויים', description: '[DEMO] סטרימינג', dayOfMonth: 18 },
  ];

  for (const item of recurring) {
    const nextRun = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, item.dayOfMonth, 0, 0, 0, 0));
    await prisma.recurringTransaction.create({
      data: {
        amount: item.amount,
        category: item.category,
        description: item.description,
        accountId: item.accountId,
        startDate: start,
        nextRun,
        dayOfMonth: item.dayOfMonth,
        monthPolicy: 'ROLL_TO_LAST_DAY',
        active: true,
      },
    });
  }
}

async function resolveUsersToSeed() {
  const emailArg = process.argv.find((arg) => arg.startsWith('--email='))?.split('=')[1];
  if (emailArg) {
    const user = await prisma.user.findUnique({ where: { email: emailArg } });
    if (!user) throw new Error(`User not found for email: ${emailArg}`);
    return [user];
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
  });
  if (users.length === 0) throw new Error('No users found. Create/sign-in a user first.');
  return users;
}

async function main() {
  const users = await resolveUsersToSeed();
  for (const user of users) {
    const { privateAccount, sharedAccount } = await ensureBaseData(user);
    await clearPreviousDemo([privateAccount.id, sharedAccount.id]);
    await seedTransactions(user, privateAccount, sharedAccount);
    await seedRecurring(user, privateAccount, sharedAccount);
    console.log(`Seeded demo data for ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
