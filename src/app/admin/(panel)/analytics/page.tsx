import Link from "next/link";
import clsx from "clsx";
import { SingleBarChart, TrafficChart } from "@/components/admin/charts";
import { AdminHeader, Badge, Card, Kpi, TableWrap } from "@/components/admin/ui";
import { EVENT_LABELS, EVENT_TYPES } from "@/lib/analytics/events";
import { getCohorts, getFunnel, getSeries, getSources, getSummary, getTopProjects, getWeekly, PERIODS, resolvePeriod } from "@/lib/analytics/server";
import { formatDate, formatNumber, formatPercent } from "@/lib/format";
import { getMetrikaSummary } from "@/lib/metrika/api";

export const metadata = { title: "Аналитика" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const period = resolvePeriod(sp.period);
  const [summary, series, sources, topProjects, weekly, cohorts, funnel, metrika] = await Promise.all([
    getSummary(period.from, period.to),
    getSeries(period),
    getSources(period.from, period.to),
    getTopProjects(period.from, period.to),
    getWeekly(8),
    getCohorts(8),
    getFunnel(period.from, period.to),
    getMetrikaSummary(period.from, period.to),
  ]);
  const maxSource = Math.max(1, ...sources.map((s) => s.visits));
  const funnelTop = Math.max(1, funnel[0].value);

  return (
    <>
      <AdminHeader title="Аналитика" text={`${period.label}: ${formatDate(period.from, true)} — ${formatDate(period.to, true)} МСК`} />

      <nav aria-label="Период" className="mb-6 flex flex-wrap gap-2">
        {PERIODS.map((p) => (
          <Link key={p.id} href={`/admin/analytics?period=${p.id}`} className="chip min-h-9 text-[13px]" aria-pressed={period.id === p.id}>
            {p.label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Визиты" value={formatNumber(summary.visits)} hint={`${formatNumber(summary.pageViews)} просмотров страниц`} />
        <Kpi label="Уникальные посетители" value={formatNumber(summary.visitors)} />
        <Kpi label="Заявки" value={formatNumber(summary.leads)} />
        <Kpi label="Конверсия" value={formatPercent(summary.conversion)} hint="заявки / уникальные посетители" />
        <Kpi label="Клики по CTA" value={formatNumber(summary.cta)} />
        <Kpi label="Телефон" value={formatNumber(summary.phone)} hint="клики по номеру" />
        <Kpi label="Email" value={formatNumber(summary.email)} hint="клики по адресу" />
        <Kpi label="Начали расчёт" value={formatNumber(summary.calcStarts)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Трафик" className="xl:col-span-2">
          <TrafficChart data={series} />
        </Card>
        <Card title="Воронка">
          <ol className="space-y-4">
            {funnel.map((f, i) => (
              <li key={f.step}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{f.step}</span>
                  <span className="tabular-nums text-mute">
                    {formatNumber(f.value)}
                    {i > 0 && ` · ${formatPercent(f.value / funnelTop)}`}
                  </span>
                </div>
                <div className="h-2 bg-ink-3">
                  <div className="h-2 bg-[#c98500]" style={{ width: `${Math.max(1, (f.value / funnelTop) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Заявки">
          <SingleBarChart data={series} dataKey="leads" name="Заявки" />
        </Card>
        <Card title="Клики по CTA">
          <SingleBarChart data={series} dataKey="cta" name="Клики по CTA" />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card title="Источники" className="xl:col-span-2">
          <div className="-m-5">
            <TableWrap>
              <thead>
                <tr>
                  <th>Источник</th>
                  <th className="w-1/3">Визиты</th>
                  <th className="text-right">Посетители</th>
                  <th className="text-right">Заявки</th>
                  <th className="text-right">Конверсия</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.source}>
                    <td>{s.source}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="h-1.5 flex-1 bg-ink-3">
                          <div className="h-1.5 bg-[#3987e5]" style={{ width: `${(s.visits / maxSource) * 100}%` }} />
                        </div>
                        <span className="w-10 text-right tabular-nums">{s.visits}</span>
                      </div>
                    </td>
                    <td className="text-right tabular-nums">{s.visitors}</td>
                    <td className="text-right tabular-nums">{s.leads}</td>
                    <td className="text-right tabular-nums">{formatPercent(s.conversion)}</td>
                  </tr>
                ))}
                {sources.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-mute">
                      Нет данных за период
                    </td>
                  </tr>
                )}
              </tbody>
            </TableWrap>
          </div>
        </Card>
        <div className="space-y-6">
          <Card title="События">
            <dl className="space-y-1.5 text-sm">
              {EVENT_TYPES.map((t) => (
                <div key={t} className="flex justify-between gap-4">
                  <dt className="text-mute">{EVENT_LABELS[t]}</dt>
                  <dd className="tabular-nums">{formatNumber(summary.byType[t] ?? 0)}</dd>
                </div>
              ))}
            </dl>
          </Card>
          <Card title="Популярные проекты">
            <ol className="space-y-1.5 text-sm">
              {topProjects.map((p) => (
                <li key={p.slug} className="flex justify-between gap-4">
                  <span className="truncate">{p.title}</span>
                  <span className="tabular-nums text-mute">{p.views}</span>
                </li>
              ))}
              {topProjects.length === 0 && <li className="text-mute">Нет просмотров</li>}
            </ol>
          </Card>
        </div>
      </div>

      <Card title="Недельная сводка (последние 8 недель)" className="mt-6">
        <div className="-m-5">
          <TableWrap>
            <thead>
              <tr>
                <th>Неделя</th>
                <th className="text-right">Визиты</th>
                <th className="text-right">к прошлой</th>
                <th className="text-right">Посетители</th>
                <th className="text-right">Заявки</th>
                <th className="text-right">Конверсия</th>
                <th>Лучший источник</th>
              </tr>
            </thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.week.toISOString()}>
                  <td className="whitespace-nowrap">с {formatDate(new Date(w.week.getTime() - 3 * 3600 * 1000))}</td>
                  <td className="text-right tabular-nums">{w.visits}</td>
                  <td className={clsx("text-right tabular-nums", w.visitsDelta === null ? "text-dim" : w.visitsDelta >= 0 ? "text-ok" : "text-err")}>
                    {w.visitsDelta === null ? "—" : `${w.visitsDelta >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(w.visitsDelta), 0)}`}
                  </td>
                  <td className="text-right tabular-nums">{w.visitors}</td>
                  <td className="text-right tabular-nums">{w.leads}</td>
                  <td className="text-right tabular-nums">{formatPercent(w.conversion)}</td>
                  <td className="text-mute">{w.topSource}</td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        </div>
      </Card>

      <Card title="Когорты по неделе первого визита" className="mt-6">
        <p className="mb-4 max-w-3xl text-xs leading-relaxed text-mute">
          Каждая строка — посетители, впервые пришедшие на сайт в эту неделю. «Вернулись» — заходили снова в следующие недели. Ячейки справа — доля когорты, оставившая заявку к N-й неделе после первого визита (накопительно). Чем темнее ячейка, тем выше конверсия.
        </p>
        <div className="-mx-5 -mb-5 overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="text-[11px] tracking-[0.1em] text-mute uppercase">
                <th className="px-4 py-2 text-left font-normal">Когорта</th>
                <th className="px-3 py-2 text-right font-normal">Посетители</th>
                <th className="px-3 py-2 text-right font-normal">Вернулись</th>
                <th className="px-3 py-2 text-right font-normal">Заявки</th>
                <th className="px-3 py-2 text-right font-normal">Конверсия</th>
                {Array.from({ length: 8 }, (_, i) => (
                  <th key={i} className="px-2 py-2 text-center font-normal">
                    Нед. {i}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => {
                const maxCell = Math.max(0.0001, ...cohorts.flatMap((x) => x.byOffset.filter((v): v is number => v !== null)));
                return (
                  <tr key={c.cohort.toISOString()} className="border-t border-line">
                    <td className="whitespace-nowrap px-4 py-2">с {formatDate(new Date(c.cohort.getTime() - 3 * 3600 * 1000))}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.size}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {c.returned} <span className="text-dim">({formatPercent(c.returnRate, 0)})</span>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{c.converted}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatPercent(c.conversion)}</td>
                    {c.byOffset.map((v, i) => (
                      <td key={i} className="p-0.5">
                        {v === null ? (
                          <div className="h-8" />
                        ) : (
                          <div
                            className="flex h-8 items-center justify-center text-xs tabular-nums"
                            style={{ background: `rgba(201,133,0,${0.08 + (v / maxCell) * 0.72})`, color: v / maxCell > 0.55 ? "#0c0c0b" : "#ede9e1" }}
                            title={`Неделя ${i}: ${formatPercent(v)} когорты оставили заявку`}
                          >
                            {formatPercent(v, 1)}
                          </div>
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Яндекс Метрика" className="mt-6">
        {metrika.ok ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Визиты (Метрика)" value={formatNumber(metrika.data.visits)} />
            <Kpi label="Посетители (Метрика)" value={formatNumber(metrika.data.users)} />
            <Kpi label="Просмотры (Метрика)" value={formatNumber(metrika.data.pageviews)} />
            <Kpi label="Отказы" value={`${formatNumber(metrika.data.bounceRate, 1)}%`} />
          </div>
        ) : (
          <div className="flex flex-col gap-2 text-sm text-mute">
            <p className="flex items-center gap-2">
              Счётчик на сайте: {process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID ? <Badge tone="ok">ID {process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID}</Badge> : <Badge tone="warn">не подключён</Badge>}
            </p>
            <p>
              {metrika.reason === "not_configured"
                ? "Чтобы видеть данные Метрики здесь, добавьте YANDEX_METRIKA_OAUTH_TOKEN (см. README). Цели (CTA, телефон, калькулятор, форма) отправляются в Метрику автоматически."
                : `Не удалось получить данные Метрики: ${metrika.reason}`}
            </p>
          </div>
        )}
      </Card>
      <p className="mt-6 text-xs text-dim">Собственная аналитика сайта: анонимный идентификатор посетителя, сессия — 30 минут неактивности. Боты отфильтрованы, админка не учитывается. Демо-данные можно удалить в настройках.</p>
    </>
  );
}
