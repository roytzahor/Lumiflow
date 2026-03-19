import OnboardingClient from '@/app/onboarding/OnboardingClient';
import { redirectToHomeIfAlreadyOnboarded } from '@/lib/onboarding';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  await redirectToHomeIfAlreadyOnboarded();
  return <OnboardingClient />;
}
