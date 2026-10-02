import type { Metadata } from "next";
import Image from "next/image";
import { Advantages } from "@/components/sections/advantages";
import { CtaBand } from "@/components/sections/cta-band";
import { PageHero, Section, SectionHeader } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { FOUNDED_YEAR } from "@/content/site";

export const metadata: Metadata = {
  title: "О компании",
  description: `VAREN строит частные дома с ${FOUNDED_YEAR} года по всей России: полный цикл, разные технологии и материалы, работа с проектом и дизайнером заказчика.`,
  alternates: { canonical: "/about" },
};

const TECH = [
  ["Газобетон", "Тёплый, точный по геометрии, предсказуемый по смете. Самый частый выбор для круглогодичного дома."],
  ["Кирпич", "Долговечность на поколения и фасад, который не требует ухода. Дороже и дольше, но это на века."],
  ["Клееный брус и бревно", "Для тех, кто любит дерево. Учитываем усадку в инженерии и отделке с первого дня."],
  ["Каркас", "Быстро, тепло и экономно. Строим по скандинавской технологии с правильной пароизоляцией."],
  ["Монолит", "Когда нужны большие пролёты, консоли и сложная архитектура."],
];

const TIMELINE = [
  ["2005", "Первая бригада из шести человек и первый дом в Подмосковье — он до сих пор стоит, мы иногда заезжаем в гости."],
  ["2009", "Собственное архитектурное бюро: перестали зависеть от чужих проектов и научились считать до чертежей."],
  ["2013", "Отдел внутренней отделки и первые проекты в паре с дизайнерами заказчиков."],
  ["2017", "Направление благоустройства: ландшафт, освещение, террасы. Дом стал продолжаться за порогом."],
  ["2021", "Работаем по всей России: свои бригады в центре и на юге, партнёры под нашим технадзором в остальных регионах."],
  ["Сегодня", "Полный цикл — от геологии до газона. И всё та же привычка приезжать на объект без предупреждения."],
];

export default function AboutPage() {
  const years = new Date().getFullYear() - FOUNDED_YEAR;
  return (
    <>
      <PageHero
        eyebrow="О компании"
        title={<>Строим с {FOUNDED_YEAR} года. Без суеты.</>}
        text="VAREN — это архитекторы, инженеры, прорабы и отделочники, которые работают вместе дольше, чем существуют многие строительные бренды."
      />

      <Section>
        <div className="grid gap-12 lg:grid-cols-12">
          <Reveal className="relative aspect-[4/5] overflow-hidden lg:col-span-5">
            <Image src="/images/photos/ph-122.webp" alt="Дом VAREN вечером" fill sizes="(min-width:1024px) 40vw, 100vw" quality={70} className="object-cover" />
          </Reveal>
          <Reveal className="prose-v text-lg lg:col-span-6 lg:col-start-7" delay={80}>
            <p className="!text-paper text-[clamp(1.3rem,2.2vw,1.8rem)] !leading-snug">
              За {years} лет мы поняли: хороший дом получается не из «премиальных материалов», а из сотни правильных мелких решений, которые никто не видит.
            </p>
            <p>
              Как уложен утеплитель под плитой. Куда выведен конденсат от котла. На какой высоте розетка у кровати. Мы ведём объект полным циклом — от геологии участка до последнего куста в саду, — потому что каждая передача работ между подрядчиками теряет часть этих решений.
            </p>
            <p>
              Материал стен выбираете вы. Мы строим из газобетона, кирпича, клееного бруса, бревна, по каркасной технологии и в монолите — и честно говорим о плюсах и минусах каждого варианта для вашего участка.
            </p>
            <p>
              Проект можно заказать у нас, а можно принести свой. Если у вас есть дизайнер — будем работать вместе с ним: он отвечает за замысел, мы — за то, чтобы замысел был построен точно.
            </p>
          </Reveal>
        </div>
      </Section>

      <Section className="border-t border-line">
        <SectionHeader eyebrow="Технологии" title="Строим из того, что подходит вам" text="Не продаём «свою» технологию. Помогаем выбрать — и строим." />
        <div className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-5">
          {TECH.map(([t, d], i) => (
            <Reveal key={t} delay={i * 60} className="bg-ink p-8">
              <h3 className="h-card text-lg">{t}</h3>
              <p className="mt-4 text-sm leading-relaxed text-mute">{d}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="border-t border-line bg-ink-2">
        <SectionHeader eyebrow="История" title="Как мы росли" />
        <ol className="border-t border-line">
          {TIMELINE.map(([y, t], i) => (
            <Reveal as="li" key={y} delay={i * 50} className="grid gap-4 border-b border-line py-8 md:grid-cols-12">
              <span className="text-2xl font-light text-sand md:col-span-3">{y}</span>
              <p className="text-[15px] leading-relaxed text-paper/80 md:col-span-7">{t}</p>
            </Reveal>
          ))}
        </ol>
      </Section>

      <Section>
        <SectionHeader eyebrow="Гарантии" title="Что мы обещаем письменно" />
        <div className="grid gap-px bg-line md:grid-cols-3">
          {[
            ["10 лет", "гарантия на фундамент, стены и кровлю"],
            ["3 года", "гарантия на инженерию и отделку"],
            ["Фикс-цена", "смета в договоре не меняется без вашего согласия"],
          ].map(([k, v]) => (
            <Reveal key={k} className="bg-ink p-10">
              <p className="text-[clamp(2.4rem,4vw,3.5rem)] font-light tracking-tight">{k}</p>
              <p className="mt-3 text-mute">{v}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Advantages index="—" />
      <CtaBand />
    </>
  );
}
