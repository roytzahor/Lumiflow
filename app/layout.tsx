import type { Metadata, Viewport } from "next";
import { Assistant } from "next/font/google";
import { Toaster } from "sonner";
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
    themeColor: "#F2F2F7",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="he" dir="rtl" suppressHydrationWarning>
            <body className={`${assistant.variable} font-sans antialiased min-h-screen bg-ios-bg text-gray-900`}>
                {children}
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
            </body>
        </html>
    );
}
