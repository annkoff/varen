/**
 * Telegram helper.
 *   npm run telegram -- setup <TOKEN>     → full automatic setup (see below)
 *   npm run telegram -- check            → bot info (getMe)
 *   npm run telegram -- chats            → chat ids from recent messages (getUpdates)
 *   npm run telegram -- test             → sends a test message to TELEGRAM_CHAT_ID
 *   npm run telegram -- webhook <url>    → setWebhook to <url>/api/telegram/webhook (needs TELEGRAM_WEBHOOK_SECRET)
 *
 * setup: validates the token, sets the bot description with the site link, the command menu
 * and the menu button, waits for you to press /start, then writes TELEGRAM_BOT_TOKEN and
 * TELEGRAM_CHAT_ID into .env and sends a welcome message with buttons.
 */
import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { BOT_COMMANDS, linkButtons, publicUrl } from "../src/lib/telegram/commands";

const [cmd = "check", arg] = process.argv.slice(2);
let token = process.env.TELEGRAM_BOT_TOKEN;
const siteUrl = (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

async function api<T = unknown>(method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(70_000),
  });
  const json = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

/** Updates or appends KEY="value" lines in .env without touching other variables. */
function writeEnv(values: Record<string, string>) {
  const file = path.resolve(".env");
  let text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  for (const [k, v] of Object.entries(values)) {
    const line = `${k}="${v}"`;
    const re = new RegExp(`^${k}=.*$`, "m");
    text = re.test(text) ? text.replace(re, line) : `${text.trimEnd()}\n${line}\n`;
  }
  fs.writeFileSync(file, text);
}

async function setup() {
  if (arg) token = arg.trim();
  if (!token || !/^\d+:[\w-]{30,}$/.test(token)) throw new Error("Передайте токен от @BotFather: npm run telegram -- setup 123456:ABC...");
  const me = await api<{ username: string; first_name: string }>("getMe");
  console.log(`✔ Токен верный: @${me.username} (${me.first_name})`);

  await api("deleteWebhook", { drop_pending_updates: true });
  await api("setMyCommands", { commands: BOT_COMMANDS });
  await api("setMyDescription", {
    description: `Бот менеджера строительной компании VAREN.\n\nПрисылает новые заявки с сайта: контакты, параметры калькулятора, стоимость, источник и файлы.\n\nСайт: ${siteUrl}`,
  });
  await api("setMyShortDescription", { short_description: `Заявки с сайта VAREN · ${siteUrl}`.slice(0, 120) });
  // Menu button opens the site inside Telegram (Mini App requires HTTPS).
  if (siteUrl.startsWith("https://")) {
    await api("setChatMenuButton", { menu_button: { type: "web_app", text: "Сайт VAREN", web_app: { url: siteUrl } } });
    console.log("✔ Кнопка меню «Сайт VAREN» открывает сайт");
  } else {
    await api("setChatMenuButton", { menu_button: { type: "commands" } });
  }
  console.log("✔ Описание со ссылкой на сайт и меню команд установлены");

  let chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId || process.argv.includes("--rebind")) {
    console.log(`\n→ Откройте https://t.me/${me.username} и нажмите «Старт» (или добавьте бота в группу менеджеров и напишите /start@${me.username}).`);
    console.log("  Жду сообщение до 5 минут…");
    const deadline = Date.now() + 5 * 60_000;
    let offset = 0;
    while (!chatId && Date.now() < deadline) {
      const updates = await api<Array<{ update_id: number; message?: { chat: { id: number; type: string; title?: string; first_name?: string }; text?: string } }>>("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        if (u.message?.text?.startsWith("/start")) {
          chatId = String(u.message.chat.id);
          console.log(`✔ Чат найден: ${u.message.chat.title ?? u.message.chat.first_name} (${chatId})`);
        }
      }
    }
    if (!chatId) throw new Error("Не дождался /start. Запустите setup ещё раз.");
    await api("getUpdates", { offset, timeout: 0 }); // acknowledge
  }

  writeEnv({
    TELEGRAM_BOT_TOKEN: token,
    TELEGRAM_CHAT_ID: chatId,
    ...(process.env.TELEGRAM_WEBHOOK_SECRET ? {} : { TELEGRAM_WEBHOOK_SECRET: randomBytes(24).toString("hex") }),
  });
  console.log("✔ TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID записаны в .env");

  const rows = linkButtons(siteUrl);
  await api("sendMessage", {
    chat_id: chatId,
    parse_mode: "HTML",
    text: `✅ <b>VAREN подключён</b>\n\nНовые заявки с сайта будут приходить в этот чат автоматически.\n\nСайт: ${siteUrl}\nАдминка: ${siteUrl}/admin${publicUrl(siteUrl) ? "" : "\n\n(кнопки-ссылки появятся, когда у сайта будет публичный адрес)"}`,
    link_preview_options: { is_disabled: true },
    ...(rows.length ? { reply_markup: { inline_keyboard: rows } } : {}),
  });
  console.log("✔ Приветственное сообщение отправлено.\n\nДальше: перезапустите сайт (npm run start / npm run dev), чтобы он подхватил новые переменные, и запустите бота: npm run bot");
}

async function main() {
  if (cmd === "setup") return setup();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан в .env (или выполните: npm run telegram -- setup <токен>)");
  if (cmd === "check") {
    console.log(await api("getMe"));
  } else if (cmd === "chats") {
    const updates = await api<Array<{ message?: { chat: { id: number; type: string; title?: string; username?: string; first_name?: string } } }>>("getUpdates");
    const chats = new Map<number, string>();
    for (const u of updates) if (u.message) chats.set(u.message.chat.id, `${u.message.chat.type}: ${u.message.chat.title ?? u.message.chat.username ?? u.message.chat.first_name}`);
    if (!chats.size) console.log("Нет сообщений. Напишите боту /start (или добавьте его в группу и напишите что-нибудь) и повторите.");
    for (const [id, name] of chats) console.log(`${id}\t${name}`);
  } else if (cmd === "test") {
    if (!process.env.TELEGRAM_CHAT_ID) throw new Error("TELEGRAM_CHAT_ID не задан");
    await api("sendMessage", { chat_id: process.env.TELEGRAM_CHAT_ID, text: "✅ VAREN: тестовое сообщение. Уведомления о заявках будут приходить сюда." });
    console.log("Отправлено.");
  } else if (cmd === "webhook") {
    if (!arg) throw new Error("Укажите адрес сайта: npm run telegram -- webhook https://example.ru");
    if (!process.env.TELEGRAM_WEBHOOK_SECRET) throw new Error("TELEGRAM_WEBHOOK_SECRET не задан");
    const url = `${arg.replace(/\/$/, "")}/api/telegram/webhook`;
    await api("setWebhook", { url, secret_token: process.env.TELEGRAM_WEBHOOK_SECRET, allowed_updates: ["message"] });
    await api("setMyCommands", { commands: BOT_COMMANDS });
    console.log(`Webhook установлен: ${url}`);
  } else {
    throw new Error(`Неизвестная команда: ${cmd}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
