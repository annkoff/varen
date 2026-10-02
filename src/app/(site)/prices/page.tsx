import type { Metadata } from "next";
import { Calculator } from "@/components/calculator/calculator";
import { Faq } from "@/components/sections/faq";
import { PriceTiers } from "@/components/sections/price-tiers";
import { PageHero, Section, SectionHeader } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { CALC_LIMITS, type CalculatorInput } from "@/lib/calculator";
import { formatNumber, formatRub } from "@/lib/format";
import { getPricing } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Стоимость и калькулятор",
  description: "Цены на строительство дома: тёплый контур от 65 000 ₽/м², предчистовая от 85 000 ₽/м², под ключ от 110 000 ₽/м². Калькулятор предварительной стоимости.",
  alternates: { canonical: "/prices" },
};

function parseInitial(sp: Record<string, string | string[] | undefined>): Partial<CalculatorInput> | undefined {
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const out: Partial<CalculatorInput> = {};
  const area = Number(s("area"));
  if (area >= CALC_LIMITS.area.min && area <= CALC_LIMITS.area.max) out.area = Math.round(area);
  const floors = Number(s("floors"));
  if (floors === 1 || floors === 2 || floors === 3) out.floors = floors;
  const material = s("material");
  if (material && ["aerated", "brick", "timber", "frame", "monolith", "other"].includes(material)) out.material = material as CalculatorInput["material"];
  const pkg = s("package");
  if (pkg && ["warm", "prefinish", "turnkey"].includes(pkg)) out.package = pkg as CalculatorInput["package"];
  return Object.keys(out).length ? out : undefined;
}

export default async function PricesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [pricing, sp] = await Promise.all([getPricing(), searchParams]);
  const initial = parseInitial(sp);
  const m = pricing.materials;

  return (
    <>
      <PageHero eyebrow="Стоимость" title="Сколько стоит построить дом" text="Ниже — ориентиры и калькулятор. Он показывает не «цену с потолка», а формулу: что входит, сколько стоит каждая строка и почему итог именно такой." />

      <Section>
        <SectionHeader eyebrow="Цены" title="Три комплектации" text="Цены указаны «от» за квадратный метр дома. Финальная смета составляется после проекта." />
        <PriceTiers pricing={pricing} />
      </Section>

      <Section id="calculator" className="scroll-mt-16 border-t border-line">
        <SectionHeader eyebrow="Калькулятор" title="Предварительный расчёт" text="Меняйте параметры — сумма пересчитывается сразу. С результатом можно сразу оставить заявку: все параметры уйдут менеджеру." />
        <Calculator pricing={pricing} initial={initial} />
      </Section>

      <Section className="border-t border-line bg-ink-2">
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="eyebrow mb-6">Как считается</p>
            <h2 className="text-[clamp(1.8rem,3vw,2.6rem)] font-light leading-tight tracking-tight">Формула без секретов</h2>
          </Reveal>
          <Reveal className="space-y-6 text-[15px] leading-relaxed text-mute lg:col-span-7" delay={80}>
            <p className="border-l border-sand pl-5 text-lg text-paper">Дом = площадь × цена комплектации за м² × коэффициент материала × коэффициент этажности</p>
            <p>
              Коэффициенты материала: {Object.values(m).map((x) => `${x.label.toLowerCase()} ×${formatNumber(x.coefficient, 2)}`).join(", ")}.
            </p>
            <p>
              Коэффициенты этажности: один этаж ×{formatNumber(pricing.floors["1"], 2)} (больше фундамента и кровли на метр площади), два ×{formatNumber(pricing.floors["2"], 2)}, три ×{formatNumber(pricing.floors["3"], 2)} (лестницы и перекрытия).
            </p>
            <p>
              Дополнительные работы считаются отдельно: дизайн, архитектура и инженерия — за м² дома, ландшафтный проект — фиксированно от {formatRub(pricing.extras.landscapeProject)}, газон — за м² газона, деревья — по количеству и размеру, освещение — по числу светильников. Итог округляется до {formatRub(pricing.roundTo)}.
            </p>
          </Reveal>
        </div>
      </Section>

      <Faq index="—" />
    </>
  );
}
