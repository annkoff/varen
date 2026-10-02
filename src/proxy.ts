import { NextResponse, type NextRequest } from "next/server";

const SESSION_COOKIE = "varen_admin";

/**
 * First line of defence for the admin area: no session cookie → no access.
 * The cookie itself is verified against the database in every admin layout,
 * server action and API route (see src/lib/auth/session.ts).
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (pathname.startsWith("/api/admin")) {
    if (!hasSession) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return addNoIndex(NextResponse.next());
  }

  if (pathname === "/admin/login") return addNoIndex(NextResponse.next());

  if (!hasSession) return NextResponse.redirect(publicUrl(req, "/admin/login"));
  return addNoIndex(NextResponse.next());
}

/** Absolute URL on the host the visitor used (the internal origin may be 0.0.0.0 in a container or behind a proxy). */
function publicUrl(req: NextRequest, path: string): URL {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? req.nextUrl.host;
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return new URL(path, `${proto}://${host}`);
}

function addNoIndex(res: NextResponse) {
  res.headers.set("x-robots-tag", "noindex, nofollow");
  res.headers.set("cache-control", "private, no-store");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
