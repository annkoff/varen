import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { MAX_FILES, sanitizeFileName, validateUpload } from "@/lib/security/files";
import { rateLimit } from "@/lib/security/rate-limit";
import { ipKey, isSameOrigin } from "@/lib/security/request";
import { newStorageKey, storage } from "@/lib/storage";

const formIdSchema = z.string().uuid();

/**
 * Uploads a single client file for a not-yet-submitted lead form.
 * The file is linked to the lead when the form with the same formId is submitted.
 */
export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const limit = rateLimit(`upload:${ipKey(req.headers)}`, 30, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "Слишком много файлов. Попробуйте позже." }, { status: 429 });

  const maxBytes = env().MAX_UPLOAD_MB * 1024 * 1024;
  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes + 64 * 1024) {
    return NextResponse.json({ error: `Файл больше ${env().MAX_UPLOAD_MB} МБ` }, { status: 413 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать файл" }, { status: 400 });
  }

  const formId = formIdSchema.safeParse(form.get("formId"));
  const file = form.get("file");
  if (!formId.success || !(file instanceof File)) {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const alreadyLead = await db.lead.findUnique({ where: { formId: formId.data }, select: { id: true } });
  if (alreadyLead) return NextResponse.json({ error: "Заявка уже отправлена" }, { status: 409 });

  const count = await db.leadFile.count({ where: { formId: formId.data, leadId: null } });
  if (count >= MAX_FILES) return NextResponse.json({ error: `Можно прикрепить не больше ${MAX_FILES} файлов` }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const check = validateUpload(file.name, file.type, buffer.length, buffer.subarray(0, 16), maxBytes);
  if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });

  const key = newStorageKey("leads", check.ext);
  try {
    await storage().put(key, buffer, check.mime);
  } catch (err) {
    console.error("[uploads] storage error", err);
    return NextResponse.json({ error: "Не удалось сохранить файл. Попробуйте ещё раз." }, { status: 500 });
  }

  const record = await db.leadFile.create({
    data: {
      formId: formId.data,
      originalName: sanitizeFileName(file.name),
      storageKey: key,
      mimeType: check.mime,
      size: buffer.length,
    },
    select: { id: true, originalName: true, size: true, mimeType: true },
  });

  void cleanupOrphans();
  return NextResponse.json(record, { status: 201 });
}

/** Removes files that were uploaded but never attached to a submitted lead (older than 24h). */
async function cleanupOrphans() {
  try {
    const stale = await db.leadFile.findMany({
      where: { leadId: null, createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      take: 50,
      select: { id: true, storageKey: true },
    });
    for (const f of stale) {
      await storage().delete(f.storageKey).catch(() => undefined);
      await db.leadFile.delete({ where: { id: f.id } }).catch(() => undefined);
    }
  } catch (err) {
    console.error("[uploads] cleanup failed", err);
  }
}
