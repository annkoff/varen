import "server-only";
import type { Lead } from "@prisma/client";
import { LEAD_SERVICE_LABELS } from "@/content/services";
import { db } from "../db";
import { env } from "../env";
import { formatDate, formatNumber, formatRub, leadNumber } from "../format";
import { describeInput, parseCalculatorInput } from "../calculator";
import { getPricing } from "../settings";
import { canUseUrlButtons, escapeHtml, sendMessage, type InlineButton } from "./client";

export async function buildLeadMessage(lead: Lead & { _count?: { files: number } }, filesCount: number) {
  const siteUrl = env().SITE_URL.replace(/\/$/, "");
  const pricing = await getPricing();
  const h = escapeHtml;
  const lines: string[] = [
    `<b>Новая заявка ${leadNumber(lead.id)}</b>${lead.isDemo ? " (демо)" : ""}`,
    `🗓 ${formatDate(lead.createdAt, true)} (МСК)`,
    "",
    `<b>Имя:</b> ${h(lead.name)}`,
    `<b>Телефон:</b> ${h(lead.phone)}`,
    `<b>Email:</b> ${lead.email ? h(lead.email) : "—"}`,
    `<b>Регион:</b> ${h(lead.region)}`,
    `<b>Услуги:</b> ${lead.services.length ? lead.services.map((s) => h(LEAD_SERVICE_LABELS[s] ?? s)).join(", ") : "—"}`,
    `<b>Площадь:</b> ${lead.area ? `${formatNumber(lead.area)} м²` : "—"}`,
  ];
  if (lead.description) lines.push(`<b>Описание:</b> ${h(lead.description.slice(0, 1200))}`);

  const calc = parseCalculatorInput(lead.calculator);
  if (calc) {
    lines.push("", "<b>Параметры калькулятора</b>");
    for (const [k, v] of describeInput(calc, pricing)) lines.push(`• ${h(k)}: ${h(v)}`);
  }
  if (lead.estimatedPrice) lines.push(`<b>Предварительная стоимость:</b> ${formatRub(lead.estimatedPrice)}`);

  lines.push(
    "",
    `<b>Источник:</b> ${h(lead.source)}`,
    `<b>Реферальный код:</b> ${lead.refCode ? h(lead.refCode) : "—"}`,
  );
  if (lead.utmCampaign) lines.push(`<b>UTM campaign:</b> ${h(lead.utmCampaign)}`);
  lines.push(`<b>Файлов:</b> ${filesCount}`);

  const leadUrl = `${siteUrl}/admin/leads/${lead.id}`;
  const adminUrl = `${siteUrl}/admin`;
  const buttons: InlineButton[] = [];
  if (canUseUrlButtons(siteUrl)) {
    buttons.push({ text: "Открыть заявку", url: leadUrl }, { text: "Открыть админку", url: adminUrl });
  } else {
    lines.push("", `Заявка: ${h(leadUrl)}`);
  }
  return { text: lines.join("\n"), buttons };
}

/** Sends the notification and records the delivery status on the lead. Never throws. */
export async function notifyLead(leadId: number): Promise<void> {
  try {
    const lead = await db.lead.findUnique({ where: { id: leadId }, include: { _count: { select: { files: true } } } });
    if (!lead) return;
    const { text, buttons } = await buildLeadMessage(lead, lead._count.files);
    const res = await sendMessage(text, buttons);
    await db.lead.update({
      where: { id: leadId },
      data: res.ok
        ? { telegramStatus: "SENT", telegramError: null }
        : { telegramStatus: res.skipped ? "SKIPPED" : "FAILED", telegramError: res.error.slice(0, 500) },
    });
    if (!res.ok) console.warn(`[telegram] lead ${leadId}: ${res.error}`);
  } catch (err) {
    console.error("[telegram] notifyLead failed", err);
  }
}
