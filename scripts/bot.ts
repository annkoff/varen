/**
 * VAREN manager bot — long polling worker. Works without a public URL (local machine, VPS).
 *   npm run bot
 * New-lead notifications are sent by the website itself; this process answers commands
 * (/start, /site, /admin, /leads, /stats, /id). On a server with HTTPS you can use the
 * webhook instead (`npm run telegram -- webhook https://domain`), then this worker is not needed.
 */
import { PrismaClient } from "@prisma/client";
import { handleUpdate, type TgButton, type TgUpdate } from "../src/lib/telegram/commands";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("TELEGRAM_BOT_TOKEN не задан. Запустите: npm run telegram -- setup <токен>");
  process.exit(1);
}
const api = `https://api.telegram.org/bot${token}`;
const db = new PrismaClient();

async function call<T>(method: string, body: Record<string, unknown>, timeoutMs = 15_000): Promise<T> {
  const res = await fetch(`${api}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

const send = (chatId: number | string, text: string, rows: TgButton[][] = []) =>
  call("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}) });

async function main() {
  const me = await call<{ username: string }>("getMe", {});
  // Polling and webhook are mutually exclusive.
  await call("deleteWebhook", { drop_pending_updates: false });
  console.log(`Бот @${me.username} запущен (long polling). Сайт: ${process.env.SITE_URL}. Ctrl+C — остановить.`);
  let offset = 0;
  for (;;) {
    try {
      const updates = await call<Array<TgUpdate & { update_id: number }>>("getUpdates", { offset, timeout: 50, allowed_updates: ["message"] }, 60_000);
      for (const u of updates) {
        offset = u.update_id + 1;
        await handleUpdate(u, { db, send, siteUrl: process.env.SITE_URL ?? "http://localhost:3000", managerChatId: process.env.TELEGRAM_CHAT_ID }).catch((e) => console.error("update failed:", e));
        if (u.message?.text) console.log(`← ${u.message.chat.id}: ${u.message.text.slice(0, 40)}`);
      }
    } catch (e) {
      console.error("polling error:", e instanceof Error ? e.message : e);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await db.$disconnect();
  process.exit(1);
});
