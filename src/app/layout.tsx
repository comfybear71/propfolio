import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Propfolio - Property Portfolio Tracker",
  description: "Track, analyse, and grow your Australian property portfolio",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen overflow-x-hidden">
        <NavBar />
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8">{children}</main>
      </body>
    </html>
  );
}
