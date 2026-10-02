import { ContactsForm, DemoCleanupForm, PasswordForm, PricingForm, TelegramTestForm } from "@/components/admin/settings-forms";
import { AdminHeader, Badge, Card } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getContacts, getPricing } from "@/lib/settings";
import { telegramConfigured } from "@/lib/telegram/client";

export const metadata = { title: "Настройки" };

export default async function SettingsPage() {
  const [contacts, pricing, demoLeads, demoVisitors] = await Promise.all([
    getContacts(),
    getPricing(),
    db.lead.count({ where: { isDemo: true } }),
    db.visitor.count({ where: { isDemo: true } }),
  ]);
  return (
    <>
      <AdminHeader title="Настройки" />
      <div className="grid gap-6 2xl:grid-cols-2">
        <Card title="Контакты на сайте">
          <ContactsForm contacts={contacts} />
        </Card>
        <Card title="Цены и калькулятор">
          <PricingForm pricing={pricing} />
        </Card>
        <Card title="Telegram">
          <p className="mb-4 flex items-center gap-3 text-sm">
            Статус: {telegramConfigured() ? <Badge tone="ok">токен и чат указаны</Badge> : <Badge tone="warn">не настроено</Badge>}
          </p>
          <p className="mb-4 text-xs leading-relaxed text-mute">
            Токен бота и ID чата задаются в переменных окружения TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID (не хранятся в базе и не видны в интерфейсе). Пошаговая инструкция — в README.
          </p>
          <TelegramTestForm />
        </Card>
        <Card title="Пароль администратора">
          <PasswordForm />
        </Card>
        <Card title="Демо-данные">
          <p className="mb-4 text-sm text-mute">
            Сейчас в базе: {demoLeads} демо-заявок и {demoVisitors} демо-посетителей. Они созданы seed-скриптом для демонстрации аналитики. Проекты и отзывы удаляются/редактируются в своих разделах.
          </p>
          <DemoCleanupForm />
        </Card>
      </div>
    </>
  );
}
