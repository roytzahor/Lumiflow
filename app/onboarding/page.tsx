import OnboardingClient from '@/app/onboarding/OnboardingClient';
import { redirectToHomeIfAlreadyOnboarded } from '@/lib/onboarding';

export default async function OnboardingPage() {
  await redirectToHomeIfAlreadyOnboarded();
  return <OnboardingClient />;
}
