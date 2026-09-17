import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { NativeBridge } from "@/components/NativeBridge";
import { TabBar } from "@/components/app/TabBar";
import { OnboardingGate } from "@/components/app/OnboardingGate";
import { PageTransition } from "@/components/app/PageTransition";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { APP_SHELL_INIT_SCRIPT } from "@/lib/appShell";

export const metadata: Metadata = {
  title: "Calisthenics Form Tracker",
  description: "Track holds, form, and progress for calisthenics skills",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "CFT",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4faf7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1512" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT + APP_SHELL_INIT_SCRIPT }} />
      </head>
      <body className="font-sans antialiased text-foreground">
        <NativeBridge />
        <OnboardingGate />
        <div className="web-only">
          <NavBar />
        </div>
        <main className="with-tabs min-h-screen pb-12 safe-bottom safe-x">
          <PageTransition>{children}</PageTransition>
        </main>
        <div className="app-shell-only">
          <TabBar />
        </div>
      </body>
    </html>
  );
}
