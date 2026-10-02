import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminHeader, Badge, Card } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/status-select";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { LEAD_SERVICE_LABELS } from "@/content/services";
import { db } from "@/lib/db";
import { describeInput, parseCalculatorInput } from "@/lib/calculator";
import { formatDate, formatFileSize, formatNumber, formatRub, leadNumber } from "@/lib/format";
import { getPricing } from "@/lib/settings";
import { deleteLead, resendTelegram, updateLeadNote, updateLeadStatus } from "../actions";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const id = Number((await params).id);
  return { title: Number.isInteger(id) ? `Заявка ${leadNumber(id)}` : "Заявка" };
}

export default async function LeadPage({ params }: Props) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const lead = await db.lead.findUnique({ where: { id }, include: { files: { orderBy: { createdAt: "asc" } }, referralLink: true } });
  if (!lead) notFound();
  const pricing = await getPricing();
  const calc = parseCalculatorInput(lead.calculator);

  const rows: Array<[string, React.ReactNode]> = [
    ["Имя", lead.name],
    ["Телефон", <a key="p" href={`tel:${lead.phone}`} className="text-sand-2 hover:underline">{lead.phone}</a>],
    ["Email", lead.email ? <a key="e" href={`mailto:${lead.email}`} className="text-sand-2 hover:underline">{lead.email}</a> : "—"],
    ["Регион", lead.region],
    ["Услуги", lead.services.map((s) => LEAD_SERVICE_LABELS[s] ?? s).join(", ") || "—"],
    ["Площадь", lead.area ? `${formatNumber(lead.area)} м²` : "—"],
    ["Согласие на обработку ПД", formatDate(lead.consentAt, true)],
  ];

  const attribution: Array<[string, React.ReactNode]> = [
    ["Источник", lead.source],
    ["Реферальная ссылка", lead.referralLink ? `${lead.referralLink.name} (${lead.referralLink.code})` : lead.refCode ?? "—"],
    ["Страница входа", lead.landingPage ?? "—"],
    ["Referrer", lead.referrer ?? "—"],
    ["UTM source / medium", [lead.utmSource, lead.utmMedium].filter(Boolean).join(" / ") || "—"],
    ["UTM campaign", lead.utmCampaign ?? "—"],
    ["UTM content / term", [lead.utmContent, lead.utmTerm].filter(Boolean).join(" / ") || "—"],
    ["Источник зафиксирован", lead.attributedAt ? formatDate(lead.attributedAt, true) : "—"],
    ["Устройство", lead.deviceType ?? "—"],
  ];

  const tgTone = { SENT: "ok", FAILED: "err", SKIPPED: "warn", PENDING: "default" } as const;
  const tgText = { SENT: "отправлено", FAILED: "ошибка", SKIPPED: "не настроен", PENDING: "в очереди" };

  return (
    <>
      <Link href="/admin/leads" className="mb-4 inline-block text-xs text-mute hover:text-paper">
        ← Все заявки
      </Link>
      <AdminHeader
        title={`Заявка ${leadNumber(lead.id)}`}
        text={<>Создана {formatDate(lead.createdAt, true)} МСК {lead.isDemo && <Badge tone="warn">демо-данные</Badge>}</>}
        actions={<StatusSelect id={lead.id} status={lead.status} action={updateLeadStatus} />}
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Card title="Клиент">
            <dl className="divide-y divide-line text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="grid gap-1 py-2.5 sm:grid-cols-[200px_1fr]">
                  <dt className="text-mute">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            {lead.description && (
              <div className="mt-5 border-t border-line pt-5">
                <p className="mb-2 text-xs text-mute">Описание</p>
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{lead.description}</p>
              </div>
            )}
          </Card>

          <Card title="Калькулятор">
            {calc ? (
              <>
                <p className="text-sm text-mute">Предварительная стоимость (пересчитана сервером)</p>
                <p className="text-3xl font-light tabular-nums">{lead.estimatedPrice ? formatRub(lead.estimatedPrice) : "—"}</p>
                <dl className="mt-5 grid gap-x-8 text-sm sm:grid-cols-2">
                  {describeInput(calc, pricing).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
                      <dt className="text-mute">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            ) : (
              <p className="text-sm text-mute">Клиент не использовал калькулятор.</p>
            )}
          </Card>

          <Card title={`Файлы (${lead.files.length})`}>
            {lead.files.length === 0 ? (
              <p className="text-sm text-mute">Файлы не прикреплены.</p>
            ) : (
              <ul className="divide-y divide-line">
                {lead.files.map((f) => (
                  <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate">{f.originalName}</span>
                      <span className="text-xs text-dim">
                        {f.mimeType} · {formatFileSize(f.size)}
                      </span>
                    </span>
                    <span className="flex gap-2">
                      <a href={`/api/admin/files/${f.id}?inline=1`} target="_blank" rel="noopener" className="btn btn-outline btn-sm">
                        Открыть
                      </a>
                      <a href={`/api/admin/files/${f.id}`} className="btn btn-primary btn-sm" data-testid="file-download">
                        Скачать
                      </a>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Заметка менеджера">
            <form action={updateLeadNote} className="space-y-3">
              <input type="hidden" name="id" value={lead.id} />
              <textarea name="note" defaultValue={lead.managerNote ?? ""} rows={5} maxLength={5000} className="field-box" placeholder="Договорились о встрече в четверг…" />
              <button type="submit" className="btn btn-outline btn-sm">
                Сохранить
              </button>
            </form>
          </Card>

          <Card title="Источник">
            <dl className="divide-y divide-line text-sm">
              {attribution.map(([k, v]) => (
                <div key={k} className="py-2">
                  <dt className="text-xs text-mute">{k}</dt>
                  <dd className="break-all">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Telegram">
            <p className="flex items-center gap-3 text-sm">
              Статус: <Badge tone={tgTone[lead.telegramStatus]}>{tgText[lead.telegramStatus]}</Badge>
            </p>
            {lead.telegramError && <p className="mt-2 break-all text-xs text-dim">{lead.telegramError}</p>}
            <form action={resendTelegram} className="mt-4">
              <input type="hidden" name="id" value={lead.id} />
              <button type="submit" className="btn btn-outline btn-sm">
                Отправить ещё раз
              </button>
            </form>
          </Card>

          <Card title="Опасная зона">
            <form action={deleteLead}>
              <input type="hidden" name="id" value={lead.id} />
              <ConfirmButton message="Удалить заявку и все её файлы? Действие необратимо." className="btn btn-outline btn-sm border-err/50 text-err">
                Удалить заявку
              </ConfirmButton>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
