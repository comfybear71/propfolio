import type { Metadata, Viewport } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { SessionProvider } from "next-auth/react";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Propfolio - Property Portfolio Tracker",
  description: "Track, analyse, and grow your Australian property portfolio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen overflow-x-hidden">
        <SessionProvider>
          <NavBar />
          <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
