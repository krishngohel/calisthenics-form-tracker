import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";
import { NativeBridge } from "@/components/NativeBridge";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

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
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className={`${sans.className} antialiased text-foreground`}>
        <NativeBridge />
        <NavBar />
        <main className="min-h-screen pb-12 safe-bottom safe-x">{children}</main>
      </body>
    </html>
  );
}
