import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { isSameOrigin } from "@/lib/security/request";
import { storage } from "@/lib/storage";

/** Removes a pending upload. Requires the secret formId it was uploaded with. */
export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const { id } = await ctx.params;
  const formId = z.string().uuid().safeParse(req.nextUrl.searchParams.get("formId"));
  if (!formId.success) return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });

  const file = await db.leadFile.findFirst({ where: { id, formId: formId.data, leadId: null } });
  if (!file) return NextResponse.json({ error: "Файл не найден" }, { status: 404 });

  await storage().delete(file.storageKey).catch(() => undefined);
  await db.leadFile.delete({ where: { id: file.id } });
  return new NextResponse(null, { status: 204 });
}
