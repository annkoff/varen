import Link from "next/link";
import { AdminHeader, EmptyState, StatusBadge, TableWrap } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/status-select";
import { LEAD_SERVICE_LABELS, LEAD_SERVICES } from "@/content/services";
import { db } from "@/lib/db";
import { formatDate, formatNumber, formatRub, leadNumber } from "@/lib/format";
import { buildLeadWhere, filtersToQuery, LEAD_STATUSES, parseLeadFilters } from "@/lib/leads/query";
import { updateLeadStatus } from "./actions";

export const metadata = { title: "Заявки" };

const PAGE_SIZE = 25;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const filters = parseLeadFilters(sp);
  const where = buildLeadWhere(filters);
  const page = Math.max(1, Number(typeof sp.page === "string" ? sp.page : 1) || 1);

  const [leads, total, regions, sources] = await Promise.all([
    db.lead.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { _count: { select: { files: true } } } }),
    db.lead.count({ where }),
    db.lead.findMany({ distinct: ["region"], select: { region: true }, orderBy: { region: "asc" } }),
    db.lead.findMany({ distinct: ["source"], select: { source: true }, orderBy: { source: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const query = filtersToQuery(filters);
  const hasFilters = query !== "";
  const pageHref = (p: number) => {
    const q = new URLSearchParams(query.slice(1));
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return `/admin/leads${s ? `?${s}` : ""}`;
  };

  return (
    <>
      <AdminHeader
        title="Заявки"
        text={`Найдено: ${total}`}
        actions={
          <a href={`/api/admin/leads/export${query}`} className="btn btn-primary btn-sm" data-testid="export-xlsx">
            Экспорт в Excel
          </a>
        }
      />

      <form method="get" className="mb-6 grid gap-3 border border-line bg-ink-2 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <input name="q" defaultValue={filters.q} placeholder="Поиск: имя, телефон, email, №" className="field-box sm:col-span-2" />
        <select name="status" defaultValue={filters.status ?? ""} className="field-box" aria-label="Статус">
          <option value="">Все статусы</option>
          {LEAD_STATUSES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="service" defaultValue={filters.service ?? ""} className="field-box" aria-label="Услуга">
          <option value="">Все услуги</option>
          {LEAD_SERVICES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <select name="region" defaultValue={filters.region ?? ""} className="field-box" aria-label="Регион">
          <option value="">Все регионы</option>
          {regions.map((r) => (
            <option key={r.region} value={r.region}>
              {r.region}
            </option>
          ))}
        </select>
        <select name="source" defaultValue={filters.source ?? ""} className="field-box" aria-label="Источник">
          <option value="">Все источники</option>
          {sources.map((s) => (
            <option key={s.source} value={s.source}>
              {s.source}
            </option>
          ))}
        </select>
        <input type="date" name="from" defaultValue={filters.from} className="field-box" aria-label="С даты" />
        <input type="date" name="to" defaultValue={filters.to} className="field-box" aria-label="По дату" />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-4 xl:col-span-8">
          <button type="submit" className="btn btn-outline btn-sm">
            Применить
          </button>
          {hasFilters && (
            <Link href="/admin/leads" className="btn btn-ghost btn-sm px-3 text-mute">
              Сбросить
            </Link>
          )}
        </div>
      </form>

      {leads.length === 0 ? (
        <EmptyState>{hasFilters ? "По фильтрам ничего не найдено." : "Заявок пока нет."}</EmptyState>
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="space-y-3 md:hidden">
            {leads.map((l) => (
              <li key={l.id} className="border border-line bg-ink-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/admin/leads/${l.id}`} className="text-sand-2">
                    {leadNumber(l.id)}
                  </Link>
                  <StatusBadge status={l.status} />
                </div>
                <p className="mt-2">{l.name}</p>
                <a href={`tel:${l.phone}`} className="text-sm text-mute">
                  {l.phone}
                </a>
                <p className="mt-2 text-xs text-dim">
                  {formatDate(l.createdAt, true)} · {l.region} · {l.source}
                </p>
                {l.estimatedPrice && <p className="mt-1 text-sm">{formatRub(l.estimatedPrice)}</p>}
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <TableWrap>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th>Регион</th>
                  <th>Услуги</th>
                  <th>Площадь</th>
                  <th>Стоимость</th>
                  <th>Источник</th>
                  <th>Файлы</th>
                  <th>Статус</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="hover:bg-ink-3/50">
                    <td>
                      <Link href={`/admin/leads/${l.id}`} className="whitespace-nowrap text-sand-2 hover:underline">
                        {leadNumber(l.id)}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap text-mute">{formatDate(l.createdAt, true)}</td>
                    <td className="min-w-40">
                      <Link href={`/admin/leads/${l.id}`} className="hover:underline">
                        {l.name}
                      </Link>
                      <span className="block text-xs text-mute">{l.phone}</span>
                      {l.email && <span className="block text-xs text-dim">{l.email}</span>}
                    </td>
                    <td className="text-mute">{l.region}</td>
                    <td className="max-w-56 text-xs text-mute">{l.services.map((s) => LEAD_SERVICE_LABELS[s] ?? s).join(", ") || "—"}</td>
                    <td className="whitespace-nowrap">{l.area ? `${formatNumber(l.area)} м²` : "—"}</td>
                    <td className="whitespace-nowrap">{l.estimatedPrice ? formatRub(l.estimatedPrice) : "—"}</td>
                    <td className="text-xs">
                      {l.source}
                      {l.refCode && <span className="block text-dim">ref: {l.refCode}</span>}
                    </td>
                    <td className="text-center">{l._count.files || "—"}</td>
                    <td>
                      <StatusSelect id={l.id} status={l.status} action={updateLeadStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          </div>

          {pages > 1 && (
            <nav className="mt-6 flex items-center justify-between text-sm" aria-label="Страницы">
              {page > 1 ? (
                <Link href={pageHref(page - 1)} className="btn btn-outline btn-sm">
                  ← Назад
                </Link>
              ) : (
                <span />
              )}
              <span className="text-mute">
                Страница {page} из {pages}
              </span>
              {page < pages ? (
                <Link href={pageHref(page + 1)} className="btn btn-outline btn-sm">
                  Далее →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
