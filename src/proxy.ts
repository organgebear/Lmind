import { NextRequest, NextResponse } from "next/server";
import { isConfigured } from "./lib/config";

const PUBLIC_PREFIXES = ["/setup", "/api/setup", "/_next", "/favicon.ico", "/LmindLogo.svg"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!isConfigured()) return NextResponse.redirect(new URL("/setup", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
