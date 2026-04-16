import type { Metadata, Viewport } from "next";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Assistant } from "next/font/google";
import ProvidersClient from "@/components/ProvidersClient";
import Script from "next/script";
import { getServerSession } from "next-auth";
import "./globals.css";

const assistant = Assistant({
    subsets: ["hebrew", "latin"],
    variable: "--font-assistant",
    weight: ["400", "500", "600", "700"],
    display: "swap",
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
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#F2F2F7" },
        { media: "(prefers-color-scheme: dark)", color: "#0F1115" },
    ],
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
                <Script id="lumiflow-chunk-load-recovery" strategy="beforeInteractive">
                    {`(function(){var k='lumiflow:chunk-timeout-retry';function tryRecover(msg){var m=String(msg||'').toLowerCase();if((m.indexOf('loading chunk')!==-1||m.indexOf('chunkloaderror')!==-1)&&m.indexOf('timeout')!==-1){try{if(sessionStorage.getItem(k)==='1')return;sessionStorage.setItem(k,'1');location.reload();}catch(e){}}}window.addEventListener('error',function(e){tryRecover(e.message||(e.error&&e.error.message)||'');},true);window.addEventListener('unhandledrejection',function(e){var r=e.reason;tryRecover(typeof r==='string'?r:(r&&r.message)?r.message:'');});})();`}
                </Script>
                <ProvidersClient initialThemePreference={initialThemePreference}>
                    {children}
                </ProvidersClient>
            </body>
        </html>
    );
}
