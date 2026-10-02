import { NextResponse, type NextRequest } from "next/server";
import { getAdminForApi } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { buildLeadsWorkbook } from "@/lib/export/leads-xlsx";
import { buildLeadWhere, parseLeadFilters } from "@/lib/leads/query";

/** Exports leads (respecting the current admin filters) to .xlsx */
export async function GET(req: NextRequest) {
  const admin = await getAdminForApi();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const where = buildLeadWhere(parseLeadFilters(req.nextUrl.searchParams));
  const leads = await db.lead.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 20_000,
    include: { _count: { select: { files: true } } },
  });
  const buffer = await buildLeadsWorkbook(leads);
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="varen-leads-${stamp}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
}
