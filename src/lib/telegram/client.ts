import "server-only";
import { env } from "../env";

export interface InlineButton {
  text: string;
  url: string;
}

export type TelegramResult = { ok: true } | { ok: false; skipped?: boolean; error: string };

export function telegramConfigured(): boolean {
  const e = env();
  return Boolean(e.TELEGRAM_BOT_TOKEN && e.TELEGRAM_CHAT_ID);
}

async function call(method: string, body: Record<string, unknown>): Promise<TelegramResult> {
  const token = env().TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, skipped: true, error: "TELEGRAM_BOT_TOKEN is not set" };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; description?: string } | null;
    if (!res.ok || !json?.ok) return { ok: false, error: json?.description ?? `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Telegram only accepts public http(s) URLs in inline buttons — no localhost. */
export function canUseUrlButtons(siteUrl: string): boolean {
  try {
    const u = new URL(siteUrl);
    return u.protocol === "https:" && !/^(localhost|127\.|10\.|192\.168\.)/.test(u.hostname);
  } catch {
    return false;
  }
}

export async function sendMessage(text: string, buttons: InlineButton[] = [], chatId?: string | number): Promise<TelegramResult> {
  const target = chatId ?? env().TELEGRAM_CHAT_ID;
  if (!target) return { ok: false, skipped: true, error: "TELEGRAM_CHAT_ID is not set" };
  return call("sendMessage", {
    chat_id: target,
    text,
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
    ...(buttons.length ? { reply_markup: { inline_keyboard: [buttons] } } : {}),
  });
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
