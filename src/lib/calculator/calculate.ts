import { formatNumber, formatRub } from "../format";
import type { CalculatorInput, CalculatorLine, CalculatorResult, PricingConfig } from "./types";

/**
 * Preliminary estimate.
 *
 *   base   = area × package price per m² × material coefficient × floors coefficient
 *   extras = per-m² works × area  +  fixed works  +  quantity-based works
 *   total  = round(base + extras, roundTo)
 *
 * The same function runs in the browser (live recalculation) and on the server
 * (the price stored with a lead is always recalculated, never trusted from the client).
 */
export function calculate(input: CalculatorInput, cfg: PricingConfig): CalculatorResult {
  const pkg = cfg.packages[input.package];
  const material = cfg.materials[input.material];
  const floorsK = cfg.floors[String(input.floors) as "1" | "2" | "3"];
  const baseAmount = input.area * pkg.pricePerM2 * material.coefficient * floorsK;

  const base: CalculatorLine = {
    id: "base",
    label: `Дом, ${pkg.label.toLowerCase()}`,
    detail: `${formatNumber(input.area)} м² × ${formatRub(pkg.pricePerM2)} · ${material.label} ×${formatNumber(material.coefficient, 2)} · ${input.floors} эт. ×${formatNumber(floorsK, 2)}`,
    amount: baseAmount,
  };

  const e = input.extras;
  const x = cfg.extras;
  const extras: CalculatorLine[] = [];

  if (e.design)
    extras.push({ id: "design", label: "Дизайн-проект интерьера", detail: `${formatNumber(input.area)} м² × ${formatRub(x.designPerM2)}`, amount: input.area * x.designPerM2 });
  if (e.architecture)
    extras.push({ id: "architecture", label: "Архитектурный проект", detail: `${formatNumber(input.area)} м² × ${formatRub(x.architecturePerM2)}`, amount: input.area * x.architecturePerM2 });
  if (e.engineering)
    extras.push({ id: "engineering", label: "Инженерные системы", detail: `${formatNumber(input.area)} м² × ${formatRub(x.engineeringPerM2)}`, amount: input.area * x.engineeringPerM2 });
  if (e.landscape)
    extras.push({ id: "landscape", label: "Ландшафтный проект", detail: "фиксированная стоимость", amount: x.landscapeProject });
  if (e.lawn.enabled)
    extras.push({ id: "lawn", label: "Газон", detail: `${formatNumber(e.lawn.area)} м² × ${formatRub(x.lawnPerM2)}`, amount: e.lawn.area * x.lawnPerM2 });
  if (e.greenery.enabled) {
    const tree = x.trees[e.greenery.treeSize];
    extras.push({
      id: "greenery",
      label: "Деревья и озеленение",
      detail: `${e.greenery.trees} шт. × ${formatRub(tree.price)} (${tree.label.toLowerCase()}) + кустарники ${e.greenery.shrubs} шт. × ${formatRub(x.shrubPrice)}`,
      amount: e.greenery.trees * tree.price + e.greenery.shrubs * x.shrubPrice,
    });
  }
  if (e.lighting.enabled)
    extras.push({ id: "lighting", label: "Освещение участка", detail: `${e.lighting.points} точек × ${formatRub(x.lightingPoint)}`, amount: e.lighting.points * x.lightingPoint });
  if (e.terrace.enabled)
    extras.push({ id: "terrace", label: "Терраса", detail: `${formatNumber(e.terrace.area)} м² × ${formatRub(x.terracePerM2)}`, amount: e.terrace.area * x.terracePerM2 });
  if (e.gazebo)
    extras.push({ id: "gazebo", label: "Беседка", detail: "базовая комплектация", amount: x.gazeboFrom });
  if (e.other.enabled)
    extras.push({ id: "other", label: "Другие работы", detail: e.other.note.trim() || "рассчитываются индивидуально", amount: 0 });

  const raw = baseAmount + extras.reduce((s, l) => s + l.amount, 0);
  const step = cfg.roundTo > 0 ? cfg.roundTo : 1;
  return { base, extras, total: Math.round(raw / step) * step, hasIndividual: e.other.enabled };
}

/** Human-readable summary used in the lead form, Telegram and the admin. */
export function describeInput(input: CalculatorInput, cfg: PricingConfig): Array<[string, string]> {
  const e = input.extras;
  const rows: Array<[string, string]> = [
    ["Площадь", `${formatNumber(input.area)} м²`],
    ["Этажность", String(input.floors)],
    ["Материал", cfg.materials[input.material].label],
    ["Комплектация", cfg.packages[input.package].label],
  ];
  if (e.design) rows.push(["Дизайн", "да"]);
  if (e.architecture) rows.push(["Архитектурный проект", "да"]);
  if (e.engineering) rows.push(["Инженерные системы", "да"]);
  if (e.landscape) rows.push(["Ландшафт", "да"]);
  if (e.lawn.enabled) rows.push(["Газон", `${formatNumber(e.lawn.area)} м²`]);
  if (e.greenery.enabled)
    rows.push(["Озеленение", `${e.greenery.trees} дер. (${cfg.extras.trees[e.greenery.treeSize].label.toLowerCase()}), ${e.greenery.shrubs} куст.`]);
  if (e.lighting.enabled) rows.push(["Освещение", `${e.lighting.points} точек`]);
  if (e.terrace.enabled) rows.push(["Терраса", `${formatNumber(e.terrace.area)} м²`]);
  if (e.gazebo) rows.push(["Беседка", "да"]);
  if (e.other.enabled) rows.push(["Другие работы", e.other.note.trim() || "да"]);
  return rows;
}
