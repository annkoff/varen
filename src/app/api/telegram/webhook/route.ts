import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { handleUpdate, type TgButton, type TgUpdate } from "@/lib/telegram/commands";

function validSecret(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Bot commands in production (set via `npm run telegram -- webhook <url>`). Locally use `npm run bot`. */
export async function POST(req: NextRequest) {
  const e = env();
  if (!validSecret(req.headers.get("x-telegram-bot-api-secret-token"), e.TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  await handleUpdate(update, {
    db,
    siteUrl: e.SITE_URL,
    managerChatId: e.TELEGRAM_CHAT_ID,
    send: (chatId, text, rows: TgButton[][] = []) =>
      fetch(`https://api.telegram.org/bot${e.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}) }),
        signal: AbortSignal.timeout(8000),
      }).catch(() => undefined),
  }).catch((err) => console.error("[telegram webhook]", err));

  return NextResponse.json({ ok: true });
}
