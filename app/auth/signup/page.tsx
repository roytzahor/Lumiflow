import SignUpClient from './SignUpClient';

export default function SignUpPage() {
  const googleAuthEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() && process.env.GOOGLE_CLIENT_SECRET?.trim()
  );

  return <SignUpClient googleAuthEnabled={googleAuthEnabled} />;
}
