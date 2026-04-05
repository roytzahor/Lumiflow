-- AlterTable
ALTER TABLE "User" ADD COLUMN "settingsProfileSectionExpanded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "settingsAppearanceSectionExpanded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "settingsAccountsSectionExpanded" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "settingsCategoriesSectionExpanded" BOOLEAN NOT NULL DEFAULT true;
