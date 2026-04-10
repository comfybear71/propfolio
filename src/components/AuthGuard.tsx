"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    // Redirect to login if not authenticated
    if (status === "unauthenticated" && !isLoginPage) {
      router.replace("/login");
    }
    // Redirect away from login if already authenticated
    if (status === "authenticated" && isLoginPage) {
      router.replace("/");
    }
  }, [status, isLoginPage, router]);

  // On login page: always show it (unless authenticated, handled by redirect above)
  if (isLoginPage) {
    return <>{children}</>;
  }

  // On any other page: only show if authenticated
  if (status === "authenticated") {
    return <>{children}</>;
  }

  // Loading or unauthenticated — show nothing (redirect will happen)
  return <div className="text-center text-[var(--muted)] py-20">Loading...</div>;
}
