/**
 * Creates the admin or resets its password.
 *   npm run admin:create -- owner@example.com "VeryStrongPassword"
 * Without arguments ADMIN_EMAIL / ADMIN_PASSWORD from the environment are used.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const [emailArg, passwordArg] = process.argv.slice(2);
const email = (emailArg ?? process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = passwordArg ?? process.env.ADMIN_PASSWORD ?? "";

async function main() {
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Укажите корректный email");
  if (password.length < 10) throw new Error("Пароль должен быть не короче 10 символов");
  const db = new PrismaClient();
  const passwordHash = await bcrypt.hash(password, 12);
  const admin = await db.admin.upsert({ where: { email }, create: { email, passwordHash }, update: { passwordHash } });
  await db.session.deleteMany({ where: { adminId: admin.id } });
  console.log(`Администратор ${email} готов. Все прежние сессии завершены.`);
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
