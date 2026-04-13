"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/properties", label: "Properties" },
  { href: "/finances", label: "Finances" },
  { href: "/assets", label: "Assets" },
  { href: "/discover", label: "Discover" },
  { href: "/borrowing", label: "Borrowing" },
  { href: "/strategy", label: "Strategy" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/documents", label: "Documents" },
  { href: "/tax-guide", label: "Tax Guide" },
];

export default function NavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: session } = useSession();

  // Don't show nav on login or setup pages
  if (pathname === "/login" || pathname === "/setup") return null;

  return (
    <nav className="border-b border-[var(--card-border)] px-3 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-[var(--accent)]">Prop</span>folio
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-5">
            {links.map((link) => (
              <Link key={link.href} href={link.href}
                className={`text-sm transition-colors ${
                  pathname === link.href
                    ? "text-[var(--accent)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}>
                {link.label}
              </Link>
            ))}
            {session?.user && (
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Sign out
              </button>
            )}
          </div>
          {/* Mobile toggle */}
          <button onClick={() => setOpen(!open)} className="md:hidden text-[var(--muted)] text-sm">
            {open ? "Close" : "Menu"}
          </button>
        </div>
        {/* Mobile nav */}
        {open && (
          <div className="md:hidden mt-3 pt-3 border-t border-[var(--card-border)] flex flex-col gap-2">
            {links.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)}
                className={`text-sm py-1 transition-colors ${
                  pathname === link.href
                    ? "text-[var(--accent)] font-medium"
                    : "text-[var(--muted)] hover:text-[var(--foreground)]"
                }`}>
                {link.label}
              </Link>
            ))}
            {session?.user && (
              <div className="pt-2 border-t border-[var(--card-border)] mt-1">
                <p className="text-xs text-[var(--muted)] mb-1">{session.user.email}</p>
                <button
                  onClick={() => { setOpen(false); signOut({ callbackUrl: "/login" }); }}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
