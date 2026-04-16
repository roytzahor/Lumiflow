-- New column: spending (pie) section expanded preference (default open for new users).
ALTER TABLE "User" ADD COLUMN "dashboardSpendingSectionExpanded" BOOLEAN NOT NULL DEFAULT true;

-- Tighter dashboard defaults for new users: recurring + savings start collapsed.
ALTER TABLE "User" ALTER COLUMN "dashboardRecurringSectionExpanded" SET DEFAULT false;
ALTER TABLE "User" ALTER COLUMN "dashboardSavingsSectionExpanded" SET DEFAULT false;
