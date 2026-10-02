"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { REF_CODE_RE } from "@/lib/analytics/events";
import { slugify } from "@/lib/slug";

export type ReferralState = { error?: string; created?: string } | undefined;

/** Name → readable short code ("Instagram весна" → "instagram-vesna"), with a random suffix on collision. */
async function uniqueCode(base: string): Promise<string> {
  const root = slugify(base, 24) || "link";
  const candidates = [root, ...Array.from({ length: 5 }, () => `${root}-${randomBytes(2).toString("hex")}`)];
  for (const c of candidates) {
    if (!REF_CODE_RE.test(c)) continue;
    if (!(await db.referralLink.findUnique({ where: { code: c }, select: { id: true } }))) return c;
  }
  return `r-${randomBytes(4).toString("hex")}`;
}

export async function createReferral(_prev: ReferralState, form: FormData): Promise<ReferralState> {
  await requireAdmin();
  const name = z.string().trim().min(2).max(80).safeParse(form.get("name"));
  if (!name.success) return { error: "Укажите название источника (2–80 символов)" };
  const custom = String(form.get("code") ?? "").trim().toLowerCase();
  let code: string;
  if (custom) {
    if (!REF_CODE_RE.test(custom)) return { error: "Код: латиница, цифры и дефис, 2–40 символов" };
    if (await db.referralLink.findUnique({ where: { code: custom } })) return { error: "Такой код уже есть" };
    code = custom;
  } else {
    code = await uniqueCode(name.data);
  }
  await db.referralLink.create({ data: { name: name.data, code } });
  revalidatePath("/admin/referrals");
  return { created: code };
}

export async function toggleReferral(form: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(form.get("id"));
  const link = await db.referralLink.findUniqueOrThrow({ where: { id } });
  await db.referralLink.update({ where: { id }, data: { archived: !link.archived } });
  revalidatePath("/admin/referrals");
}
