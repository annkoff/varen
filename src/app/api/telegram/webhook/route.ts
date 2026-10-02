import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatDate, formatRub, leadNumber } from "@/lib/format";
import { escapeHtml, sendMessage } from "@/lib/telegram/client";

interface Update {
  message?: { chat: { id: number; type: string; title?: string }; text?: string };
}

function validSecret(header: string | null, expected: string | undefined): boolean {
  if (!expected || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Optional bot commands (set via setWebhook with secret_token):
 *   /start, /id   — show the chat id (helps to fill TELEGRAM_CHAT_ID)
 *   /leads        — the last 5 leads (only in the configured manager chat)
 */
export async function POST(req: NextRequest) {
  const e = env();
  if (!validSecret(req.headers.get("x-telegram-bot-api-secret-token"), e.TELEGRAM_WEBHOOK_SECRET)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = (await req.json().catch(() => null)) as Update | null;
  const msg = update?.message;
  if (!msg?.text) return NextResponse.json({ ok: true });

  const chatId = msg.chat.id;
  const command = msg.text.trim().split(/[\s@]/)[0].toLowerCase();

  if (command === "/start" || command === "/id") {
    await sendMessage(
      `Бот менеджера VAREN.\nID этого чата: <code>${chatId}</code>\nУкажите его в переменной TELEGRAM_CHAT_ID, чтобы получать заявки.`,
      [],
      chatId
    );
  } else if (command === "/leads") {
    if (String(chatId) !== e.TELEGRAM_CHAT_ID) {
      await sendMessage("Этот чат не подключён к заявкам.", [], chatId);
    } else {
      const leads = await db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
      const text = leads.length
        ? leads
            .map((l) => `<b>${leadNumber(l.id)}</b> · ${formatDate(l.createdAt, true)}\n${escapeHtml(l.name)}, ${escapeHtml(l.phone)}${l.estimatedPrice ? ` · ${formatRub(l.estimatedPrice)}` : ""}`)
            .join("\n\n")
        : "Заявок пока нет.";
      await sendMessage(text, [], chatId);
    }
  }
  return NextResponse.json({ ok: true });
}
