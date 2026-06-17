import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { NavBar } from "@/components/NavBar";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Calisthenics Form Tracker",
  description: "Track holds, form, and progress for calisthenics skills",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CFT",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${sans.className} antialiased text-foreground`}>
        <NavBar />
        <main className="min-h-screen pb-12 safe-bottom">{children}</main>
      </body>
    </html>
  );
}
