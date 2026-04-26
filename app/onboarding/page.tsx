import { redirect } from 'next/navigation';

/** Legacy URL: onboarding is now automatic; advanced setup lives in Settings. */
export default function OnboardingPage() {
  redirect('/');
}
