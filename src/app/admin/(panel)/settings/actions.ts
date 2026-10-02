"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword, PASSWORD_MIN_LENGTH, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { contactsSchema, getPricing, pricingSchema, saveSetting } from "@/lib/settings";
import { sendMessage } from "@/lib/telegram/client";

export type SettingsState = { error?: string; ok?: string } | undefined;

export async function saveContacts(_p: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const parsed = contactsSchema.safeParse(Object.fromEntries(["phone", "phoneHref", "email", "address", "hours", "hoursNote"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) return { error: parsed.error.issues.map((i) => `${String(i.path[0])}: ${i.message}`).join("; ") };
  await saveSetting("contacts", parsed.data);
  revalidatePath("/", "layout");
  return { ok: "Контакты сохранены" };
}

/** Form fields are named by JSON path, e.g. "packages.warm.pricePerM2". */
export async function savePricing(_p: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  const current = structuredClone(await getPricing()) as unknown as Record<string, unknown>;
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("p:")) continue;
    const path = key.slice(2).split(".");
    let obj: Record<string, unknown> | undefined = current;
    // Only existing own keys of the config may be written.
    for (const seg of path.slice(0, -1)) obj = obj && Object.hasOwn(obj, seg) ? (obj[seg] as Record<string, unknown>) : undefined;
    const last = path[path.length - 1];
    if (!obj || typeof obj !== "object" || !Object.hasOwn(obj, last)) continue;
    obj[last] = typeof obj[last] === "number" ? Number(String(value).replace(",", ".").replace(/\s/g, "")) : String(value);
  }
  const parsed = pricingSchema.safeParse(current);
  if (!parsed.success) return { error: "Проверьте значения: цены — неотрицательные числа, коэффициенты от 0,1 до 5" };
  await saveSetting("pricing", parsed.data);
  revalidatePath("/", "layout");
  return { ok: "Цены сохранены — калькулятор уже считает по ним" };
}

export async function changePassword(_p: SettingsState, form: FormData): Promise<SettingsState> {
  const admin = await requireAdmin();
  const current = String(form.get("current") ?? "");
  const next = String(form.get("next") ?? "");
  const repeat = String(form.get("repeat") ?? "");
  if (next.length < PASSWORD_MIN_LENGTH) return { error: `Новый пароль — минимум ${PASSWORD_MIN_LENGTH} символов` };
  if (next !== repeat) return { error: "Пароли не совпадают" };
  const row = await db.admin.findUniqueOrThrow({ where: { id: admin.id } });
  if (!(await verifyPassword(current, row.passwordHash))) return { error: "Текущий пароль неверен" };
  await db.admin.update({ where: { id: admin.id }, data: { passwordHash: await hashPassword(next) } });
  return { ok: "Пароль изменён" };
}

export async function telegramTest(): Promise<SettingsState> {
  await requireAdmin();
  const res = await sendMessage("✅ <b>VAREN</b>: тестовое сообщение из админ-панели. Уведомления о заявках будут приходить сюда.");
  return res.ok ? { ok: "Сообщение отправлено — проверьте Telegram" } : { error: `Не отправлено: ${res.error}` };
}

export async function deleteDemoData(_p: SettingsState, form: FormData): Promise<SettingsState> {
  await requireAdmin();
  if (z.literal("DELETE").safeParse(form.get("confirm")).success === false) return { error: "Введите DELETE для подтверждения" };
  const leads = await db.lead.deleteMany({ where: { isDemo: true } });
  const visitors = await db.visitor.deleteMany({ where: { isDemo: true } });
  revalidatePath("/admin", "layout");
  return { ok: `Удалено демо-заявок: ${leads.count}, демо-посетителей: ${visitors.count} (вместе с их событиями)` };
}
