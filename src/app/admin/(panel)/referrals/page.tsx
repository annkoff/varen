import { CopyButton } from "@/components/admin/copy-button";
import { ReferralCreate } from "@/components/admin/referral-create";
import { AdminHeader, Badge, Card, EmptyState, TableWrap } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { publicSiteUrl } from "@/lib/site-url";
import { formatDate, formatPercent } from "@/lib/format";
import { toggleReferral } from "./actions";

export const metadata = { title: "Реферальные ссылки" };

export default async function ReferralsPage() {
  const site = publicSiteUrl();
  const links = await db.referralLink.findMany({ orderBy: [{ archived: "asc" }, { createdAt: "desc" }] });

  const [clicks, uniques, leads] = await Promise.all([
    db.referralClick.groupBy({ by: ["referralLinkId"], _count: { _all: true } }),
    db.$queryRaw<Array<{ id: string; n: bigint }>>`SELECT "referralLinkId" AS id, COUNT(DISTINCT "visitorId") AS n FROM "ReferralClick" GROUP BY 1`,
    db.lead.groupBy({ by: ["referralLinkId"], where: { referralLinkId: { not: null } }, _count: { _all: true } }),
  ]);
  const clickMap = new Map(clicks.map((c) => [c.referralLinkId, c._count._all]));
  const uniqMap = new Map(uniques.map((u) => [u.id, Number(u.n)]));
  const leadMap = new Map(leads.map((l) => [l.referralLinkId, l._count._all]));

  return (
    <>
      <AdminHeader title="Реферальные ссылки" text="Источник сохраняется на 90 дней: даже если человек походит по сайту и вернётся позже, заявка будет привязана к ссылке." />
      <Card title="Новая ссылка" className="mb-6">
        <ReferralCreate />
      </Card>

      {links.length === 0 ? (
        <EmptyState>Ссылок пока нет.</EmptyState>
      ) : (
        <TableWrap>
          <thead>
            <tr>
              <th>Название</th>
              <th>Ссылка</th>
              <th>Создана</th>
              <th className="text-right">Клики</th>
              <th className="text-right">Уникальные</th>
              <th className="text-right">Заявки</th>
              <th className="text-right">Конверсия</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {links.map((l) => {
              const url = `${site}/r/${l.code}`;
              const u = uniqMap.get(l.id) ?? 0;
              const ld = leadMap.get(l.id) ?? 0;
              return (
                <tr key={l.id} className={l.archived ? "opacity-50" : undefined}>
                  <td>
                    {l.name}
                    {l.archived && (
                      <span className="ml-2">
                        <Badge>в архиве</Badge>
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-sand-2">/r/{l.code}</code>
                      <CopyButton value={url} />
                    </div>
                    <span className="mt-1 block text-[11px] text-dim">или {site}/?ref={l.code}</span>
                  </td>
                  <td className="whitespace-nowrap text-mute">{formatDate(l.createdAt)}</td>
                  <td className="text-right tabular-nums">{clickMap.get(l.id) ?? 0}</td>
                  <td className="text-right tabular-nums">{u}</td>
                  <td className="text-right tabular-nums">{ld}</td>
                  <td className="text-right tabular-nums">{u ? formatPercent(ld / u) : "—"}</td>
                  <td>
                    <form action={toggleReferral}>
                      <input type="hidden" name="id" value={l.id} />
                      <button className="text-xs text-mute hover:text-paper">{l.archived ? "Вернуть" : "В архив"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </TableWrap>
      )}
      <p className="mt-4 text-xs text-dim">Клик — переход по ссылке; уникальные — разные посетители; конверсия — заявки / уникальные посетители. Ссылки в архиве перестают присваивать источник.</p>
    </>
  );
}
