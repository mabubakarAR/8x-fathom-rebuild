import { auth } from "@/auth";
import { NextResponse } from "next/server";

// Route protection. Everything is behind sign-in except the front door, the
// public share links, the legal pages, the auth handshake itself, and the
// setup probe. A signed-out visitor to any app route lands on the front door.

const PUBLIC = [
  /^\/$/,
  /^\/s\//,
  /^\/privacy$/,
  /^\/terms$/,
  /^\/about$/,
  /^\/api\/auth\//,
  /^\/api\/setup$/,
  /^\/api\/calls\/[^/]+\/audio$/, // audio behind a share link
  /^\/samples\//,
  /^\/extension\//,
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  if (PUBLIC.some((re) => re.test(pathname))) return NextResponse.next();
  if (!req.auth?.user?.id) {
    // API calls get a 401, pages get the front door.
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sign in first" }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:png|jpg|svg|webp|ico|txt|vtt|zip)$).*)"],
};
