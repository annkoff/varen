import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { isSafeKey, storage } from "@/lib/storage";

/** Public catalog images uploaded via the admin. Only keys under media/ that belong to a project are served. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await ctx.params;
  const key = parts.join("/");
  if (!key.startsWith("media/") || !isSafeKey(key)) return new NextResponse("Not found", { status: 404 });

  const image = await db.projectImage.findFirst({ where: { storageKey: key }, select: { id: true } });
  if (!image) return new NextResponse("Not found", { status: 404 });

  const obj = await storage().get(key);
  if (!obj) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(obj.body, {
    headers: {
      "content-type": obj.contentType,
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
