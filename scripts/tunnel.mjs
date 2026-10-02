/**
 * Public HTTPS URL for a site running on this machine (demo / review without hosting).
 *   npm run tunnel
 * Keeps an SSH tunnel to localhost.run alive, reconnects automatically and writes the current
 * public address to .tunnel-url — the site, Telegram buttons and the bot read it at runtime
 * (PUBLIC_URL_FILE=.tunnel-url in .env). For production use real hosting instead.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const PORT = process.env.PORT ?? "3000";
const FILE = path.resolve(process.env.PUBLIC_URL_FILE ?? ".tunnel-url");
let current = "";

/** Keeps the bot menu button ("Сайт VAREN") pointing at the live address. */
async function updateBotMenu(url) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ menu_button: { type: "web_app", text: "Сайт VAREN", web_app: { url } } }),
    });
    const json = await res.json();
    console.log(json.ok ? "  ✔ кнопка меню бота обновлена" : `  ! кнопка меню: ${json.description}`);
    // Tell the manager the new address so nobody opens a dead link.
    const chat = process.env.TELEGRAM_CHAT_ID;
    if (chat) {
      await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          chat_id: chat,
          text: `🔗 Актуальный адрес сайта VAREN:\n${url}\n\nАдминка: ${url}/admin\n(временный адрес демо-туннеля — старые ссылки больше не работают)`,
          link_preview_options: { is_disabled: true },
          reply_markup: { inline_keyboard: [[{ text: "🌐 Открыть сайт", url }, { text: "🔐 Админка", url: `${url}/admin` }]] },
        }),
      });
      console.log("  ✔ новый адрес отправлен в Telegram");
    }
  } catch (e) {
    console.log(`  ! кнопка меню: ${e.message}`);
  }
}

function connect() {
  const ssh = spawn(
    "ssh",
    ["-o", "StrictHostKeyChecking=accept-new", "-o", "ServerAliveInterval=15", "-o", "ServerAliveCountMax=3", "-o", "ExitOnForwardFailure=yes", "-R", `80:localhost:${PORT}`, "nokey@localhost.run"],
    { stdio: ["ignore", "pipe", "pipe"] }
  );
  const onData = (buf) => {
    const m = /https:\/\/[a-z0-9-]+\.lhr\.life/.exec(buf.toString());
    if (m && m[0] !== current) {
      current = m[0];
      fs.writeFileSync(FILE, current);
      console.log(`${new Date().toLocaleTimeString("ru-RU")}  ✔ публичный адрес: ${current}`);
      void updateBotMenu(current);
    }
  };
  ssh.stdout.on("data", onData);
  ssh.stderr.on("data", onData);
  ssh.on("exit", (code) => {
    console.log(`${new Date().toLocaleTimeString("ru-RU")}  туннель закрыт (код ${code}), переподключаюсь через 3 с…`);
    setTimeout(connect, 3000);
  });
}

console.log(`Туннель к http://localhost:${PORT} → localhost.run. Адрес пишется в ${path.basename(FILE)}. Ctrl+C — остановить.`);
connect();
