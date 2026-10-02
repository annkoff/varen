"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";

const schema = z.object({
  authorName: z.string().trim().min(2).max(80),
  authorCity: z.string().trim().min(2).max(80),
  text: z.string().trim().min(20).max(2000),
  rating: z.coerce.number().int().min(1).max(5),
  projectId: z.string().trim().max(40).transform((v) => v || null),
});

function revalidateReviews() {
  revalidatePath("/");
  revalidatePath("/reviews");
  revalidatePath("/projects", "layout");
  revalidatePath("/admin/reviews");
}

export type ReviewState = { error?: string; ok?: boolean } | undefined;

export async function saveReview(_prev: ReviewState, form: FormData): Promise<ReviewState> {
  await requireAdmin();
  const parsed = schema.safeParse({
    authorName: form.get("authorName"),
    authorCity: form.get("authorCity"),
    text: form.get("text"),
    rating: form.get("rating"),
    projectId: form.get("projectId") ?? "",
  });
  if (!parsed.success) return { error: "Заполните имя, город и текст (от 20 символов)" };
  const id = form.get("id") ? String(form.get("id")) : null;
  const data = { ...parsed.data, published: form.get("published") === "on", isDemo: form.get("isDemo") === "on" };
  if (id) await db.review.update({ where: { id }, data });
  else await db.review.create({ data });
  revalidateReviews();
  return { ok: true };
}

export async function deleteReview(form: FormData) {
  await requireAdmin();
  await db.review.delete({ where: { id: z.string().min(1).parse(form.get("id")) } });
  revalidateReviews();
}
