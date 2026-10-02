import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { REF_CODE_RE } from "@/lib/analytics/events";

/**
 * Short referral link: /r/<code> → /?ref=<code> (UTM parameters are preserved).
 * The click itself is counted by the first page view carrying ?ref=, so both
 * /r/<code> and /?ref=<code> links behave identically.
 *
 * The Location header is relative on purpose: behind a reverse proxy or in a container
 * the request origin may be an internal address (e.g. 0.0.0.0:3000).
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ code: string }> }) {
  const { code: raw } = await ctx.params;
  const code = raw.toLowerCase();

  if (REF_CODE_RE.test(code)) {
    const link = await db.referralLink.findUnique({ where: { code }, select: { archived: true } });
    if (link && !link.archived) {
      const params = new URLSearchParams({ ref: code });
      for (const [k, v] of req.nextUrl.searchParams) if (k.startsWith("utm_")) params.set(k, v.slice(0, 120));
      const res = new NextResponse(null, { status: 307, headers: { Location: `/?${params}` } });
      res.cookies.set("varen_ref", code, { maxAge: 90 * 24 * 3600, path: "/", sameSite: "lax" });
      return res;
    }
  }
  return new NextResponse(null, { status: 307, headers: { Location: "/" } });
}
