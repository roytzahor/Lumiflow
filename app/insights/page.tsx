import { Suspense } from "react";
import AppNav from "@/components/AppNav";
import InsightsBodySkeleton from "@/components/insights-body-skeleton";
import InsightsDataSection from "@/app/insights/insights-data-section";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";
import { format } from "date-fns";
import { he } from "date-fns/locale";

export default async function InsightsPage() {
  await redirectToOnboardingIfNeeded();

  const now = new Date();
  const thisMonthLabel = format(now, "MMMM yyyy", { locale: he });

  return (
    <main className="min-h-screen pb-28 lg:pb-8 pt-safe bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-ios-dark-text lg:ps-64">
      <div className="w-full max-w-md lg:max-w-3xl mx-auto px-5 py-8 space-y-4">
        <header className="mb-2">
          <h1 className="text-3xl font-bold tracking-tight">תובנות</h1>
          <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mt-0.5">{thisMonthLabel}</p>
        </header>

        <Suspense fallback={<InsightsBodySkeleton />}>
          <InsightsDataSection />
        </Suspense>
      </div>

      <AppNav />
    </main>
  );
}
