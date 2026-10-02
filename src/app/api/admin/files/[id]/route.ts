import { NextResponse, type NextRequest } from "next/server";
import { getAdminForApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";

/** Client files are private: only an authenticated admin can download them. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const admin = await getAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const file = await db.leadFile.findUnique({ where: { id } });
  if (!file || !file.leadId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const obj = await storage().get(file.storageKey);
  if (!obj) return NextResponse.json({ error: "File is missing in storage" }, { status: 404 });

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  const encoded = encodeURIComponent(file.originalName);
  return new NextResponse(obj.body, {
    headers: {
      "content-type": file.mimeType,
      "content-disposition": `${inline ? "inline" : "attachment"}; filename="file.${file.storageKey.split(".").pop()}"; filename*=UTF-8''${encoded}`,
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
      ...(obj.size ? { "content-length": String(obj.size) } : {}),
    },
  });
}
