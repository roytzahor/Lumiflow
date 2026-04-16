import { Suspense } from "react";
import BottomNav from "@/components/BottomNav";
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
    <main className="min-h-screen pb-28 pt-safe bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-ios-dark-text">
      <div className="w-full max-w-md mx-auto px-5 py-8 space-y-4">
        <header className="mb-2">
          <h1 className="text-3xl font-bold tracking-tight">תובנות</h1>
          <p className="text-sm text-ios-subtle dark:text-ios-dark-subtle mt-0.5">{thisMonthLabel}</p>
        </header>

        <Suspense fallback={<InsightsBodySkeleton />}>
          <InsightsDataSection />
        </Suspense>
      </div>

      <BottomNav />
    </main>
  );
}
