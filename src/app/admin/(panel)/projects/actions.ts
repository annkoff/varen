"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { storage } from "@/lib/storage";

export type ProjectFormState = { error?: string; fieldErrors?: Record<string, string>; ok?: boolean } | undefined;

const lines = (v: FormDataEntryValue | null) =>
  String(v ?? "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 40);

const schema = z.object({
  title: z.string().trim().min(2, "Укажите название").max(120),
  slug: z.string().trim().max(80).optional(),
  location: z.string().trim().min(2, "Укажите место").max(120),
  summary: z.string().trim().min(10, "Минимум 10 символов").max(400),
  description: z.string().trim().min(10, "Минимум 10 символов").max(6000),
  area: z.coerce.number().int().min(10, "От 10 м²").max(5000),
  floors: z.coerce.number().int().min(1).max(5),
  material: z.string().trim().min(2, "Укажите материал").max(60),
  style: z.string().trim().min(2, "Укажите стиль").max(60),
  year: z.coerce.number().int().min(2005).max(2100),
  durationMonths: z.coerce.number().int().min(1).max(60),
  plotArea: z.union([z.literal(""), z.coerce.number().int().min(1).max(10_000)]).transform((v) => (v === "" ? null : v)),
  packageLevel: z.enum(["warm", "prefinish", "turnkey"]),
});

function revalidateCatalog(slug?: string) {
  revalidatePath("/");
  revalidatePath("/projects");
  if (slug) revalidatePath(`/projects/${slug}`);
  revalidatePath("/admin/projects");
}

export async function saveProject(_prev: ProjectFormState, form: FormData): Promise<ProjectFormState> {
  await requireAdmin();
  const id = form.get("id") ? String(form.get("id")) : null;
  const parsed = schema.safeParse(Object.fromEntries(["title", "slug", "location", "summary", "description", "area", "floors", "material", "style", "year", "durationMonths", "plotArea", "packageLevel"].map((k) => [k, form.get(k) ?? ""])));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { error: "Проверьте поля", fieldErrors };
  }
  const d = parsed.data;
  const slug = slugify(d.slug || d.title);
  if (!slug) return { error: "Не удалось сформировать адрес страницы", fieldErrors: { slug: "Укажите латиницей" } };
  const clash = await db.project.findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) return { error: "Такой адрес уже занят", fieldErrors: { slug: "Адрес занят другим проектом" } };

  const data = {
    ...d,
    slug,
    worksDone: lines(form.get("worksDone")),
    extras: lines(form.get("extras")),
    published: form.get("published") === "on",
    featured: form.get("featured") === "on",
  };

  if (id) {
    const before = await db.project.findUnique({ where: { id }, select: { slug: true } });
    await db.project.update({ where: { id }, data });
    revalidateCatalog(before?.slug);
    revalidateCatalog(slug);
    return { ok: true };
  }
  const max = await db.project.aggregate({ _max: { sortOrder: true } });
  const created = await db.project.create({ data: { ...data, sortOrder: (max._max.sortOrder ?? 0) + 1 } });
  revalidateCatalog(slug);
  redirect(`/admin/projects/${created.id}?created=1`);
}

export async function deleteProject(form: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(form.get("id"));
  const images = await db.projectImage.findMany({ where: { projectId: id, storageKey: { not: null } }, select: { storageKey: true } });
  for (const i of images) if (i.storageKey) await storage().delete(i.storageKey).catch(() => undefined);
  const p = await db.project.delete({ where: { id } });
  revalidateCatalog(p.slug);
  redirect("/admin/projects");
}

export async function toggleProjectFlag(form: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(form.get("id"));
  const flag = z.enum(["published", "featured"]).parse(form.get("flag"));
  const p = await db.project.findUniqueOrThrow({ where: { id }, select: { published: true, featured: true, slug: true } });
  await db.project.update({ where: { id }, data: { [flag]: !p[flag] } });
  revalidateCatalog(p.slug);
}

export async function moveProject(form: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(form.get("id"));
  const dir = z.enum(["up", "down"]).parse(form.get("dir"));
  const all = await db.project.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], select: { id: true } });
  const i = all.findIndex((p) => p.id === id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= all.length) return;
  [all[i], all[j]] = [all[j], all[i]];
  await db.$transaction(all.map((p, idx) => db.project.update({ where: { id: p.id }, data: { sortOrder: idx } })));
  revalidateCatalog();
}

// ─── Images ──────────────────────────────────────────────

async function imageProject(imageId: string) {
  const img = await db.projectImage.findUniqueOrThrow({ where: { id: imageId }, include: { project: { select: { id: true, slug: true } } } });
  return img;
}

export async function updateImage(form: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(form.get("id"));
  const category = z.enum(["EXTERIOR", "INTERIOR", "FINISHING", "PLOT", "LANDSCAPE", "EXTRA"]).parse(form.get("category"));
  const alt = z.string().trim().max(200).parse(form.get("alt") ?? "");
  const img = await imageProject(id);
  await db.projectImage.update({ where: { id }, data: { category, alt } });
  revalidateCatalog(img.project.slug);
  revalidatePath(`/admin/projects/${img.project.id}`);
}

export async function deleteImage(form: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(form.get("id"));
  const img = await imageProject(id);
  if (img.storageKey) await storage().delete(img.storageKey).catch(() => undefined);
  await db.projectImage.delete({ where: { id } });
  revalidateCatalog(img.project.slug);
  revalidatePath(`/admin/projects/${img.project.id}`);
}

/** dir: "up" | "down" | "cover" (cover = first image, used on cards and the hero). */
export async function moveImage(form: FormData) {
  await requireAdmin();
  const id = z.string().min(1).parse(form.get("id"));
  const dir = z.enum(["up", "down", "cover"]).parse(form.get("dir"));
  const img = await imageProject(id);
  const all = await db.projectImage.findMany({ where: { projectId: img.projectId }, orderBy: { sortOrder: "asc" }, select: { id: true } });
  const i = all.findIndex((x) => x.id === id);
  if (dir === "cover") all.unshift(...all.splice(i, 1));
  else {
    const j = dir === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= all.length) return;
    [all[i], all[j]] = [all[j], all[i]];
  }
  await db.$transaction(all.map((x, idx) => db.projectImage.update({ where: { id: x.id }, data: { sortOrder: idx } })));
  revalidateCatalog(img.project.slug);
  revalidatePath(`/admin/projects/${img.project.id}`);
}
