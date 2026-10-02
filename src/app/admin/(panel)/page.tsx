import Link from "next/link";
import { AdminHeader, Badge, Card, Kpi, StatusBadge, TableWrap } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatDate, formatPercent, formatRub, leadNumber } from "@/lib/format";
import { getSummary, resolvePeriod } from "@/lib/analytics/server";
import { telegramConfigured } from "@/lib/telegram/client";

export const metadata = { title: "Дашборд" };

export default async function DashboardPage() {
  const week = resolvePeriod("7d");
  const today = resolvePeriod("today");
  const [summary7, summaryToday, newCount, inProgress, latest, total, projects] = await Promise.all([
    getSummary(week.from, week.to),
    getSummary(today.from, today.to),
    db.lead.count({ where: { status: "NEW" } }),
    db.lead.count({ where: { status: "IN_PROGRESS" } }),
    db.lead.findMany({ orderBy: { createdAt: "desc" }, take: 8, include: { _count: { select: { files: true } } } }),
    db.lead.count(),
    db.project.count({ where: { published: true } }),
  ]);

  return (
    <>
      <AdminHeader
        title="Дашборд"
        text={`Сегодня ${formatDate(new Date())}`}
        actions={
          <>
            <Link href="/admin/leads" className="btn btn-primary btn-sm">
              Все заявки
            </Link>
            <a href="/api/admin/leads/export" className="btn btn-outline btn-sm">
              Экспорт в Excel
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Новые заявки" value={newCount} hint={`${inProgress} в работе · ${total} всего`} />
        <Kpi label="Заявки сегодня" value={summaryToday.leads} hint={`за 7 дней: ${summary7.leads}`} />
        <Kpi label="Посетители, 7 дней" value={summary7.visitors} hint={`${summary7.visits} визитов`} />
        <Kpi label="Конверсия, 7 дней" value={formatPercent(summary7.conversion)} hint="заявки / уникальные посетители" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Последние заявки" className="xl:col-span-2" action={<Link href="/admin/leads" className="text-xs text-mute hover:text-paper">Все →</Link>}>
          <div className="-m-5">
            <TableWrap>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th>Источник</th>
                  <th>Стоимость</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((l) => (
                  <tr key={l.id} className="hover:bg-ink-3/50">
                    <td>
                      <Link href={`/admin/leads/${l.id}`} className="text-sand-2 hover:underline">
                        {leadNumber(l.id)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-mute">{formatDate(l.createdAt, true)}</td>
                    <td>
                      {l.name}
                      <span className="block text-xs text-mute">{l.phone}</span>
                    </td>
                    <td className="text-mute">{l.source}</td>
                    <td className="whitespace-nowrap">{l.estimatedPrice ? formatRub(l.estimatedPrice) : "—"}</td>
                    <td>
                      <StatusBadge status={l.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title="Состояние">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-4">
                Telegram-уведомления
                {telegramConfigured() ? <Badge tone="ok">подключены</Badge> : <Badge tone="warn">не настроены</Badge>}
              </li>
              <li className="flex items-center justify-between gap-4">
                Яндекс Метрика
                {process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ? <Badge tone="ok">ID {process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID}</Badge> : <Badge tone="warn">не указан ID</Badge>}
              </li>
              <li className="flex items-center justify-between gap-4">
                Хранилище файлов
                <Badge>{process.env.STORAGE_DRIVER === "s3" ? "S3" : "локальный диск"}</Badge>
              </li>
              <li className="flex items-center justify-between gap-4">
                Опубликовано проектов
                <Badge>{projects}</Badge>
              </li>
            </ul>
            {!telegramConfigured() && (
              <p className="mt-4 text-xs leading-relaxed text-dim">
                Укажите TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в переменных окружения — инструкция в README. Проверить отправку можно в <Link href="/admin/settings" className="underline">настройках</Link>.
              </p>
            )}
          </Card>
          <Card title="За 7 дней">
            <dl className="space-y-2 text-sm">
              {[
                ["Клики по CTA", summary7.cta],
                ["Клики по телефону", summary7.phone],
                ["Клики по email", summary7.email],
                ["Начали расчёт", summary7.calcStarts],
                ["Просмотры проектов", summary7.projectViews],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className="text-mute">{k}</dt>
                  <dd className="tabular-nums">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href="/admin/analytics" className="mt-4 inline-block text-xs text-sand-2 hover:underline">
              Подробная аналитика →
            </Link>
          </Card>
        </div>
      </div>
    </>
  );
}
