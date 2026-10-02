import { after, NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createLead, LeadError } from "@/lib/leads/service";
import { leadPayloadSchema } from "@/lib/leads/schema";
import { rateLimit } from "@/lib/security/rate-limit";
import { deviceTypeFromUA, ipKey, isSameOrigin } from "@/lib/security/request";
import { notifyLead } from "@/lib/telegram/notify-lead";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req.headers)) return NextResponse.json({ error: "Запрос отклонён" }, { status: 403 });
  const limit = rateLimit(`lead:${ipKey(req.headers)}`, 5, 10 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Слишком много заявок подряд. Попробуйте через несколько минут или позвоните нам." },
      { status: 429, headers: { "retry-after": String(limit.retryAfter) } }
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = leadPayloadSchema.safeParse(json);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return NextResponse.json({ error: "Проверьте поля формы", fieldErrors }, { status: 422 });
  }

  try {
    const { id, duplicate } = await createLead(parsed.data, {
      userAgentDevice: deviceTypeFromUA(req.headers.get("user-agent")),
      refCookie: req.cookies.get("varen_ref")?.value ?? null,
    });
    // Telegram is sent after the response so the visitor never waits for it.
    if (!duplicate) after(() => notifyLead(id));
    return NextResponse.json({ id, duplicate }, { status: duplicate ? 200 : 201 });
  } catch (err) {
    if (err instanceof LeadError) return NextResponse.json({ error: err.message }, { status: err.status });
    // Two parallel submits of the same form: the unique formId wins once.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const lead = await db.lead.findUnique({ where: { formId: parsed.data.formId }, select: { id: true } });
      if (lead) return NextResponse.json({ id: lead.id, duplicate: true });
    }
    console.error("[leads] create failed", err);
    return NextResponse.json({ error: "Не удалось отправить заявку. Попробуйте ещё раз или позвоните нам." }, { status: 500 });
  }
}
