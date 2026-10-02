import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/primitives";
import type { PricingConfig } from "@/lib/calculator";
import { formatRub } from "@/lib/format";

const INCLUDES: Record<"warm" | "prefinish" | "turnkey", string[]> = {
  warm: ["Фундамент", "Стены и перекрытия", "Кровля", "Окна и входная дверь", "Фасад по проекту"],
  prefinish: ["Всё из тёплого контура", "Разводка инженерии", "Стяжка и штукатурка", "Электрика без чистовой фурнитуры"],
  turnkey: ["Всё из предчистовой", "Чистовая отделка", "Санузлы и сантехника", "Свет, двери, кухня", "Уборка и сдача"],
};

export function PriceTiers({ pricing }: { pricing: PricingConfig }) {
  const tiers = (["warm", "prefinish", "turnkey"] as const).map((id) => ({ id, ...pricing.packages[id] }));
  const extras = [
    ["Дизайн интерьера", `от ${formatRub(pricing.extras.designPerM2)}/м²`],
    ["Ландшафтный проект", `от ${formatRub(pricing.extras.landscapeProject)}`],
    ["Газон", `от ${formatRub(pricing.extras.lawnPerM2)}/м²`],
    ["Деревья и озеленение", "по выбранным параметрам"],
  ];
  return (
    <div>
      <div className="grid gap-px bg-line md:grid-cols-3">
        {tiers.map((t, i) => (
          <Reveal key={t.id} delay={i * 90} className={`flex flex-col p-8 md:p-10 ${t.id === "turnkey" ? "bg-ink-3" : "bg-ink"}`}>
            <div className="flex items-center justify-between">
              <h3 className="eyebrow text-paper">{t.label}</h3>
              {t.id === "turnkey" && <span className="text-[10px] tracking-[0.2em] text-sand uppercase">Чаще выбирают</span>}
            </div>
            <p className="mt-8 text-sm text-mute">от</p>
            <p className="text-[clamp(2rem,3.4vw,2.8rem)] font-light tracking-tight">
              {formatRub(t.pricePerM2)}
              <span className="text-base text-mute">/м²</span>
            </p>
            <p className="mt-5 text-[15px] leading-relaxed text-mute">{t.description}</p>
            <ul className="mt-8 flex-1 space-y-2.5 border-t border-line pt-6 text-sm text-paper/80">
              {INCLUDES[t.id].map((x) => (
                <li key={x} className="flex gap-3">
                  <span className="mt-2 h-px w-3 shrink-0 bg-sand" />
                  {x}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
      <div className="mt-px grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {extras.map(([k, v]) => (
          <div key={k} className="bg-ink px-8 py-6 md:px-10">
            <p className="text-sm text-mute">{k}</p>
            <p className="mt-1 text-lg font-light">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-sm leading-relaxed text-mute">
          Все цены — предварительные, «от». Точная стоимость зависит от проекта, материалов и состава работ и фиксируется в смете до подписания договора.
        </p>
        <ButtonLink href="/prices#calculator" cta="price_block_calculator">
          Рассчитать стоимость
        </ButtonLink>
      </div>
    </div>
  );
}
