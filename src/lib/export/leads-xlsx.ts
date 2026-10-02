import "server-only";
import ExcelJS from "exceljs";
import type { Lead } from "@prisma/client";
import { LEAD_SERVICE_LABELS } from "@/content/services";
import { STATUS_LABELS } from "../leads/query";
import { leadNumber, TIMEZONE } from "../format";

type LeadRow = Lead & { _count: { files: number } };

/** Builds a real .xlsx workbook (Office Open XML), not CSV. */
export async function buildLeadsWorkbook(leads: LeadRow[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "VAREN";
  wb.created = new Date();
  const ws = wb.addWorksheet("Заявки", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = [
    { header: "ID", key: "num", width: 11 },
    { header: "Дата", key: "date", width: 18, style: { numFmt: "dd.mm.yyyy hh:mm" } },
    { header: "Имя", key: "name", width: 22 },
    { header: "Телефон", key: "phone", width: 17 },
    { header: "Email", key: "email", width: 26 },
    { header: "Регион", key: "region", width: 22 },
    { header: "Услуги", key: "services", width: 36 },
    { header: "Площадь, м²", key: "area", width: 12 },
    { header: "Описание", key: "description", width: 50 },
    { header: "Комплектация", key: "package", width: 16 },
    { header: "Материал", key: "material", width: 16 },
    { header: "Этажность", key: "floors", width: 11 },
    { header: "Предварительная стоимость, ₽", key: "price", width: 20, style: { numFmt: "#,##0" } },
    { header: "Источник", key: "source", width: 18 },
    { header: "Реферальный код", key: "ref", width: 16 },
    { header: "UTM campaign", key: "utm", width: 18 },
    { header: "Файлов", key: "files", width: 9 },
    { header: "Статус", key: "status", width: 13 },
  ];

  // Excel has no time zones: write Moscow wall-clock time.
  const toMoscow = (d: Date) => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
    }).formatToParts(d);
    const g = (t: string) => Number(parts.find((p) => p.type === t)?.value);
    return new Date(Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute")));
  };

  for (const l of leads) {
    ws.addRow({
      num: leadNumber(l.id),
      date: toMoscow(l.createdAt),
      name: l.name,
      phone: l.phone,
      email: l.email ?? "",
      region: l.region,
      services: l.services.map((s) => LEAD_SERVICE_LABELS[s] ?? s).join(", "),
      area: l.area ?? null,
      description: l.description ?? "",
      package: l.calcPackage ?? "",
      material: l.calcMaterial ?? "",
      floors: l.calcFloors ?? null,
      price: l.estimatedPrice ?? null,
      source: l.source,
      ref: l.refCode ?? "",
      utm: l.utmCampaign ?? "",
      files: l._count.files,
      status: STATUS_LABELS[l.status],
    });
  }

  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A18" } };
  header.alignment = { vertical: "middle", wrapText: true };
  header.height = 30;
  ws.getColumn("description").alignment = { wrapText: true, vertical: "top" };
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columns.length } };

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
