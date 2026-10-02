/**
 * Telegram helper.
 *   npm run telegram -- check            → bot info (getMe)
 *   npm run telegram -- chats            → chat ids from recent messages (getUpdates)
 *   npm run telegram -- test             → sends a test message to TELEGRAM_CHAT_ID
 *   npm run telegram -- webhook <url>    → setWebhook to <url>/api/telegram/webhook (needs TELEGRAM_WEBHOOK_SECRET)
 */
const token = process.env.TELEGRAM_BOT_TOKEN;
const [cmd = "check", arg] = process.argv.slice(2);

async function api(method: string, body?: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = (await res.json()) as { ok: boolean; result?: unknown; description?: string };
  if (!json.ok) throw new Error(`${method}: ${json.description}`);
  return json.result;
}

async function main() {
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN не задан в .env");
  if (cmd === "check") {
    console.log(await api("getMe"));
  } else if (cmd === "chats") {
    const updates = (await api("getUpdates")) as Array<{ message?: { chat: { id: number; type: string; title?: string; username?: string; first_name?: string } } }>;
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
    await api("setMyCommands", { commands: [{ command: "id", description: "ID этого чата" }, { command: "leads", description: "Последние заявки" }] });
    console.log(`Webhook установлен: ${url}`);
  } else {
    throw new Error(`Неизвестная команда: ${cmd}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
