import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the request is for login or signup pages
  if (pathname === "/login" || pathname === "/signup") {
    // Check for session cookie (better-auth uses cookies)
    const sessionCookie = request.cookies.get("better-auth.session_token");

    if (sessionCookie) {
      // User is authenticated, redirect to owner dashboard
      return NextResponse.redirect(new URL("/owner", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/signup"],
};