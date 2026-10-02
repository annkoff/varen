import "server-only";
import { createHmac, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "../db";
import { env, isProd } from "../env";

export const SESSION_COOKIE = "varen_admin";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Only an HMAC of the token is stored, so a DB leak does not leak live sessions. */
function hashToken(token: string): string {
  return createHmac("sha256", env().AUTH_SECRET).update(token).digest("hex");
}

export async function createSession(adminId: string, userAgent: string | null) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.session.create({
    data: { adminId, tokenHash: hashToken(token), expiresAt, userAgent: userAgent?.slice(0, 300) },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  jar.delete(SESSION_COOKIE);
}

export const getCurrentAdmin = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: { select: { id: true, email: true, name: true } } },
  });
  if (!session) return null;
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.admin;
});

/** Use in admin pages and server actions. Redirects to login when unauthenticated. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Use in admin route handlers. Returns null when unauthenticated. */
export async function getAdminForApi() {
  return getCurrentAdmin();
}
