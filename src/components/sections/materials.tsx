import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeader } from "@/components/ui/primitives";
import type { PricingConfig } from "@/lib/calculator";
import { formatNumber } from "@/lib/format";
import { blurProps } from "@/lib/images";

const MATERIALS: Array<{ key: keyof PricingConfig["materials"] | null; title: string; image: string; text: string; filter: string }> = [
  { key: "aerated", title: "Газобетон", image: "/images/materials/aerated.webp", filter: "Газобетон", text: "Тёплый, лёгкий и точный по геометрии. Самый частый выбор для дома, в котором живут круглый год." },
  { key: "brick", title: "Кирпич", image: "/images/materials/brick.webp", filter: "Кирпич", text: "Дом на поколения: прочные стены, фасад без ухода и хорошая звукоизоляция." },
  { key: "timber", title: "Клееный брус", image: "/images/materials/timber.webp", filter: "Клееный брус", text: "Тёплое дерево без трещин и почти без усадки. Можно жить сразу после стройки." },
  { key: null, title: "Оцилиндрованное бревно", image: "/images/materials/log.webp", filter: "Оцилиндрованное бревно", text: "Классический сруб из северной сосны. Учитываем усадку в инженерии и отделке с первого дня." },
  { key: "frame", title: "Каркас", image: "/images/materials/frame.webp", filter: "Каркас", text: "Быстро, тепло и экономно. Скандинавская технология с правильной пароизоляцией." },
  { key: "monolith", title: "Монолит", image: "/images/materials/monolith.webp", filter: "Монолит", text: "Когда нужны большие пролёты, консоли и сложная архитектура." },
];

export function Materials({ pricing, index }: { pricing: PricingConfig; index?: string }) {
  return (
    <Section>
      <SectionHeader
        index={index}
        eyebrow="Материалы"
        title="Строим из того, что подходит вам"
        text="Материал стен выбираете вы. Мы расскажем, как он поведёт себя на вашем участке, и честно сравним цены."
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MATERIALS.map((m, i) => {
          const coef = m.key ? pricing.materials[m.key].coefficient : pricing.materials.timber.coefficient;
          return (
            <Reveal key={m.title} delay={(i % 3) * 80}>
              <Link href={`/projects?material=${encodeURIComponent(m.filter)}`} className="group relative isolate flex aspect-[4/3] flex-col justify-end overflow-hidden p-7 md:aspect-[5/4]" data-cta={`material_${m.filter}`}>
                <Image
                  src={m.image}
                  {...blurProps(m.image)}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  quality={85}
                  className="-z-10 object-cover opacity-70 transition-[transform,opacity] duration-1000 group-hover:scale-105 group-hover:opacity-85"
                />
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
                <span className="absolute right-6 top-6 border border-paper/30 px-2.5 py-1 text-[11px] tracking-[0.12em] text-paper/80">
                  ×{formatNumber(coef, 2)} к цене
                </span>
                <h3 className="text-2xl font-light tracking-tight">{m.title}</h3>
                <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-paper/75">{m.text}</p>
                <span className="mt-5 text-[11px] tracking-[0.18em] text-sand-2 uppercase opacity-80 transition-opacity group-hover:opacity-100">Проекты из материала →</span>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
