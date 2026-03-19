import type { Metadata, Viewport } from "next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Assistant } from "next/font/google";
import { Toaster } from "sonner";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import AppRuntimeGuard from "@/components/AppRuntimeGuard";
import PendingInviteGate from "@/components/PendingInviteGate";
import ThemeProvider from "@/components/ThemeProvider";
import { getServerSession } from "next-auth";
import "./globals.css";

const assistant = Assistant({
    subsets: ["hebrew", "latin"],
    variable: "--font-assistant",
    weight: ["200", "300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
    title: "LumiFlow",
    description: "Couple Finance, Simplified",
    appleWebApp: {
        capable: true,
        statusBarStyle: "default",
        title: "LumiFlow",
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    viewportFit: "cover",
    themeColor: "#0F1115",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerSession(authOptions);
    const email = session?.user?.email?.trim().toLowerCase();
    let initialThemePreference: "LIGHT" | "DARK" | "SYSTEM" = "SYSTEM";
    if (email) {
        const user = await prisma.user.findUnique({
            where: { email },
            select: { themePreference: true },
        });
        initialThemePreference = user?.themePreference ?? "SYSTEM";
    }

    const htmlThemeClass = initialThemePreference === "DARK" ? "dark" : undefined;

    return (
        <html lang="he" dir="rtl" suppressHydrationWarning className={htmlThemeClass}>
            <body className={`${assistant.variable} font-sans antialiased min-h-screen bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-ios-dark-text transition-colors`}>
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
                                borderRadius: '14px',
                                fontFamily: 'var(--font-assistant)',
                            },
                        }}
                    />
                </ThemeProvider>
            </body>
        </html>
    );
}
