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
    // Remember where they were going. The extension deep-links straight to
    // /record?join=…, and losing that on the way through sign-in is the
    // difference between "it worked" and "it dumped me on the front page".
    const url = req.nextUrl.clone();
    const next = pathname + req.nextUrl.search;
    url.pathname = "/";
    url.search = next === "/" ? "" : `?next=${encodeURIComponent(next)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|.*\\.(?:png|jpg|svg|webp|ico|txt|vtt|zip)$).*)"],
};
