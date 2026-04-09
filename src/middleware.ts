export { auth as middleware } from "@/lib/auth";

export const config = {
  // Protect everything except login page, auth API, public assets, and search APIs
  matcher: [
    "/((?!login|api/auth|api/rapidapi-search|api/domain-search|_next/static|_next/image|favicon.ico|images).*)",
  ],
};
