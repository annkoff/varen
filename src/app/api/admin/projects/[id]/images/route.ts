import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import type { ImageCategory } from "@prisma/client";
import { getAdminForApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { validateUpload } from "@/lib/security/files";
import { isSameOrigin } from "@/lib/security/request";
import { newStorageKey, storage } from "@/lib/storage";

const CATEGORIES: ImageCategory[] = ["EXTERIOR", "INTERIOR", "FINISHING", "PLOT", "LANDSCAPE", "EXTRA"];
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

/** Admin uploads catalog photos; they are re-encoded to WebP (≤2000px) to keep the site fast. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await ctx.params;
  const project = await db.project.findUnique({ where: { id }, select: { id: true, slug: true, title: true } });
  if (!project) return NextResponse.json({ error: "Проект не найден" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const categoryRaw = String(form?.get("category") ?? "EXTERIOR");
  const category = CATEGORIES.includes(categoryRaw as ImageCategory) ? (categoryRaw as ImageCategory) : "EXTERIOR";
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

  const input = Buffer.from(await file.arrayBuffer());
  const check = validateUpload(file.name, file.type, input.length, input.subarray(0, 16), MAX_IMAGE_BYTES, true);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  let webp: Buffer;
  try {
    webp = await sharp(input).rotate().resize({ width: 2000, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
  } catch {
    return NextResponse.json({ error: "Не удалось обработать изображение" }, { status: 400 });
  }

  const key = newStorageKey("media", "webp");
  await storage().put(key, webp, "image/webp");
  const last = await db.projectImage.findFirst({ where: { projectId: id }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const image = await db.projectImage.create({
    data: {
      projectId: id,
      url: `/media/${key}`,
      storageKey: key,
      alt: project.title,
      category,
      sortOrder: (last?.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath(`/projects/${project.slug}`);
  revalidatePath("/projects");
  return NextResponse.json(image, { status: 201 });
}
