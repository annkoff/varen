/**
 * Telegram bot commands. Shared by the webhook route (production) and the
 * long-polling worker `npm run bot` (local / no public URL). No server-only imports.
 */
import type { PrismaClient } from "@prisma/client";
import { formatDate, formatRub, leadNumber } from "../format";

export interface TgButton {
  text: string;
  url: string;
}

export interface TgUpdate {
  message?: { chat: { id: number; type: string; title?: string; first_name?: string }; text?: string };
}

export interface BotContext {
  db: PrismaClient;
  siteUrl: string;
  managerChatId?: string;
  send: (chatId: number | string, text: string, rows?: TgButton[][]) => Promise<unknown>;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Telegram accepts URL buttons only for public http(s) hosts. */
export function publicUrl(siteUrl: string): boolean {
  try {
    const u = new URL(siteUrl);
    return /^https?:$/.test(u.protocol) && !/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.)/.test(u.hostname);
  } catch {
    return false;
  }
}

export function linkButtons(siteUrl: string): TgButton[][] {
  const base = siteUrl.replace(/\/$/, "");
  if (!publicUrl(base)) return [];
  return [
    [
      { text: "🌐 Открыть сайт", url: base },
      { text: "🔐 Админка", url: `${base}/admin` },
    ],
    [
      { text: "📋 Заявки", url: `${base}/admin/leads` },
      { text: "⬇️ Excel", url: `${base}/api/admin/leads/export` },
    ],
  ];
}

export const BOT_COMMANDS = [
  { command: "start", description: "Начало работы и ссылки" },
  { command: "site", description: "Ссылка на сайт" },
  { command: "admin", description: "Ссылка на админку" },
  { command: "leads", description: "Последние 5 заявок" },
  { command: "stats", description: "Сводка за сегодня и неделю" },
  { command: "id", description: "ID этого чата" },
];

export async function handleUpdate(update: TgUpdate, ctx: BotContext): Promise<void> {
  const msg = update.message;
  if (!msg?.text) return;
  const chatId = msg.chat.id;
  const isManager = !!ctx.managerChatId && String(chatId) === String(ctx.managerChatId);
  const command = msg.text.trim().split(/[\s@]/)[0].toLowerCase();
  const base = ctx.siteUrl.replace(/\/$/, "");
  const links = linkButtons(base);
  const textLinks = links.length ? "" : `\n\nСайт: ${base}\nАдминка: ${base}/admin`;

  switch (command) {
    case "/start":
    case "/help":
      await ctx.send(
        chatId,
        [
          "<b>VAREN — бот менеджера</b>",
          "",
          isManager
            ? "✅ Этот чат подключён: сюда автоматически приходят все новые заявки с сайта — с контактами, расчётом калькулятора, источником и файлами."
            : `ID этого чата: <code>${chatId}</code>\nЧтобы получать заявки, укажите его в TELEGRAM_CHAT_ID.`,
          "",
          "Команды: /leads — последние заявки, /stats — сводка, /site — сайт, /admin — админка.",
        ].join("\n") + textLinks,
        links
      );
      return;
    case "/site":
      await ctx.send(chatId, `🌐 Сайт VAREN: ${base}`, links.length ? [[links[0][0]]] : []);
      return;
    case "/admin":
      await ctx.send(chatId, `🔐 Админ-панель: ${base}/admin`, links.length ? [[links[0][1]]] : []);
      return;
    case "/id":
      await ctx.send(chatId, `ID этого чата: <code>${chatId}</code>`);
      return;
    case "/leads":
    case "/stats":
      if (!isManager) {
        await ctx.send(chatId, "Эта команда доступна только в чате менеджеров.");
        return;
      }
      if (command === "/leads") {
        const leads = await ctx.db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
        const text = leads.length
          ? leads
              .map((l) => `<b>${leadNumber(l.id)}</b> · ${formatDate(l.createdAt, true)}\n${esc(l.name)}, ${esc(l.phone)}${l.estimatedPrice ? ` · ${formatRub(l.estimatedPrice)}` : ""}\nИсточник: ${esc(l.source)}`)
              .join("\n\n")
          : "Заявок пока нет.";
        await ctx.send(chatId, text, links.length ? [[{ text: "📋 Все заявки", url: `${base}/admin/leads` }]] : []);
      } else {
        const dayStart = new Date(Math.floor((Date.now() + 3 * 3600e3) / 86400e3) * 86400e3 - 3 * 3600e3);
        const weekStart = new Date(dayStart.getTime() - 6 * 86400e3);
        const [today, week, fresh, total] = await Promise.all([
          ctx.db.lead.count({ where: { createdAt: { gte: dayStart } } }),
          ctx.db.lead.count({ where: { createdAt: { gte: weekStart } } }),
          ctx.db.lead.count({ where: { status: "NEW" } }),
          ctx.db.lead.count(),
        ]);
        await ctx.send(chatId, `<b>Сводка VAREN</b>\nСегодня: ${today}\nЗа 7 дней: ${week}\nНовых (не в работе): ${fresh}\nВсего заявок: ${total}`, links.length ? [[{ text: "📊 Аналитика", url: `${base}/admin/analytics` }]] : []);
      }
      return;
    default:
      if (command.startsWith("/")) await ctx.send(chatId, "Не знаю такой команды. Список: /start");
  }
}
