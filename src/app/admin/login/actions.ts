"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession } from "@/lib/auth/session";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { ipKey } from "@/lib/security/request";

const MAX_PAIR_FAILURES = 5;
const MAX_IP_FAILURES = 20;
const MAX_EMAIL_FAILURES = 100;
const WINDOW_MS = 15 * 60 * 1000;

// Compared against for unknown emails so the response time does not reveal which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword(randomBytes(16).toString("hex")));

export type LoginState = { error?: string } | undefined;

const schema = z.object({
  email: z.string().trim().toLowerCase().email().max(120),
  password: z.string().min(1).max(200),
});

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Введите email и пароль" };
  const { email, password } = parsed.data;

  const h = await headers();
  const ip = ipKey(h);
  const keys = { pair: `email-ip:${email}:${ip}`, ip: `ip:${ip}`, email: `email:${email}` };
  const windowStart = new Date(Date.now() - WINDOW_MS);
  // Failures since the window start or since the last successful login for that key, whichever is later.
  const failuresFor = async (key: string) => {
    const lastOk = await db.loginAttempt.findFirst({ where: { key, success: true, createdAt: { gt: windowStart } }, orderBy: { createdAt: "desc" }, select: { createdAt: true } });
    return db.loginAttempt.count({ where: { key, success: false, createdAt: { gt: lastOk?.createdAt ?? windowStart } } });
  };
  const [pairFailures, ipFailures, emailFailures] = await Promise.all([failuresFor(keys.pair), failuresFor(keys.ip), failuresFor(keys.email)]);
  // Per email+IP lockout stops guessing without letting a stranger lock the owner out from another network;
  // the per-IP and global per-email caps stop wide or distributed brute force.
  if (pairFailures >= MAX_PAIR_FAILURES || ipFailures >= MAX_IP_FAILURES || emailFailures >= MAX_EMAIL_FAILURES) {
    return { error: "Слишком много неудачных попыток. Попробуйте через 15 минут." };
  }

  const admin = await db.admin.findUnique({ where: { email } });
  const ok = (await verifyPassword(password, admin?.passwordHash ?? (await getDummyHash()))) && !!admin;

  await db.loginAttempt.createMany({ data: Object.values(keys).map((key) => ({ key, success: ok })) });
  // Old attempts are not needed after the window.
  void db.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } }).catch(() => undefined);

  if (!admin || !ok) return { error: "Неверный email или пароль" };

  await db.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await db.session.deleteMany({ where: { adminId: admin.id, expiresAt: { lt: new Date() } } });
  await createSession(admin.id, h.get("user-agent"));
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
