import { Suspense } from "react";
import AppNav from "@/components/AppNav";
import DashboardPageSkeleton from "@/components/dashboard-page-skeleton";
import DashboardDataLoader from "@/app/dashboard-data-loader";
import { redirectToOnboardingIfNeeded } from "@/lib/onboarding";

export default async function Home({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await redirectToOnboardingIfNeeded();
  const params = searchParams ? await searchParams : {};

  return (
    <main className="min-h-screen bg-ios-bg dark:bg-ios-dark-bg transition-colors lg:ps-64">
      <Suspense fallback={<DashboardPageSkeleton />}>
        <DashboardDataLoader searchParams={params} />
      </Suspense>
      <AppNav />
    </main>
  );
}
