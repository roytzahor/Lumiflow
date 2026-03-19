"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

type ThemePreference = "LIGHT" | "DARK" | "SYSTEM";

function mapThemePreferenceToClientTheme(theme: ThemePreference): "light" | "dark" | "system" {
  if (theme === "LIGHT") return "light";
  if (theme === "DARK") return "dark";
  return "system";
}

export default function ThemeProvider({
  children,
  initialThemePreference = "SYSTEM",
}: {
  children: ReactNode;
  initialThemePreference?: ThemePreference;
}) {
  const defaultTheme = mapThemePreferenceToClientTheme(initialThemePreference);

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={defaultTheme}
      enableSystem={initialThemePreference === "SYSTEM"}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
