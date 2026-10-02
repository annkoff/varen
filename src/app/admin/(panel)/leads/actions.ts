"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import { notifyLead } from "@/lib/telegram/notify-lead";

const idSchema = z.coerce.number().int().positive();

export async function updateLeadStatus(form: FormData) {
  await requireAdmin();
  const id = idSchema.parse(form.get("id"));
  const status = z.enum(["NEW", "IN_PROGRESS", "DONE", "CANCELLED"]).parse(form.get("status"));
  await db.lead.update({ where: { id }, data: { status } });
  revalidatePath("/admin", "layout");
}

export async function updateLeadNote(form: FormData) {
  await requireAdmin();
  const id = idSchema.parse(form.get("id"));
  const note = z.string().max(5000).parse(form.get("note") ?? "");
  await db.lead.update({ where: { id }, data: { managerNote: note.trim() || null } });
  revalidatePath(`/admin/leads/${id}`);
}

export async function resendTelegram(form: FormData) {
  await requireAdmin();
  const id = idSchema.parse(form.get("id"));
  await notifyLead(id);
  revalidatePath(`/admin/leads/${id}`);
}

export async function deleteLead(form: FormData) {
  await requireAdmin();
  const id = idSchema.parse(form.get("id"));
  const files = await db.leadFile.findMany({ where: { leadId: id }, select: { storageKey: true } });
  for (const f of files) await storage().delete(f.storageKey).catch(() => undefined);
  await db.lead.delete({ where: { id } });
  revalidatePath("/admin", "layout");
  redirect("/admin/leads");
}
