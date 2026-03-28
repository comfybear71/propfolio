import type { Metadata } from "next";
import "./globals.css";

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
      <body className="antialiased min-h-screen">
        <nav className="border-b border-[var(--card-border)] px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-[var(--accent)]">Prop</span>folio
            </h1>
            <span className="text-sm text-[var(--muted)]">
              Property Portfolio Tracker
            </span>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
