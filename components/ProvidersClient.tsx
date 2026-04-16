"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import AppRuntimeGuard from "@/components/AppRuntimeGuard";
import ThemeProvider from "@/components/ThemeProvider";

const PendingInviteGate = dynamic(() => import("@/components/PendingInviteGate"), { ssr: false });

const Toaster = dynamic(
  () => import("sonner").then((mod) => ({ default: mod.Toaster })),
  { ssr: false }
);

type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

export default function ProvidersClient({
  children,
  initialThemePreference,
}: {
  children: ReactNode;
  initialThemePreference: ThemePreference;
}) {
  return (
    <ThemeProvider initialThemePreference={initialThemePreference}>
      <AppRuntimeGuard />
      <AppErrorBoundary>
        {children}
        <PendingInviteGate />
      </AppErrorBoundary>
      <Toaster
        position="top-center"
        richColors
        closeButton
        dir="rtl"
        toastOptions={{
          style: {
            borderRadius: "14px",
            fontFamily: "var(--font-assistant)",
          },
        }}
      />
    </ThemeProvider>
  );
}
