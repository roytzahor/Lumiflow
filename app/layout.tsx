import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import { Toaster } from "sonner";
import PendingInviteGate from "@/components/PendingInviteGate";
import ThemeProvider from "@/components/ThemeProvider";
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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="he" dir="rtl" suppressHydrationWarning>
            <body className={`${assistant.variable} font-sans antialiased min-h-screen bg-ios-bg dark:bg-ios-dark-bg text-ios-text dark:text-ios-dark-text transition-colors`}>
                <ThemeProvider>
                    {children}
                    <PendingInviteGate />
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
