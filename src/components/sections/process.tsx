import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeader } from "@/components/ui/primitives";

const STEPS = [
  { t: "Знакомство", d: "Созваниваемся или встречаемся в офисе на Волхонке. Обсуждаем участок, бюджет и то, как вы хотите жить.", time: "1 день" },
  { t: "Выезд на участок", d: "Смотрим рельеф, подъезды, соседей и солнце. Заказываем геологию.", time: "1–2 недели" },
  { t: "Проект и смета", d: "Делаем проект или адаптируем ваш. Считаем смету по разделам — до подписания договора.", time: "3–8 недель" },
  { t: "Договор", d: "Фиксируем цену, график платежей по этапам и гарантии.", time: "1 неделя" },
  { t: "Стройка", d: "Работаем по графику, еженедельно отчитываемся. Платите только за выполненные этапы.", time: "5–14 месяцев" },
  { t: "Сдача и гарантия", d: "Передаём дом, исполнительные схемы и паспорт дома. Дальше — гарантийное обслуживание.", time: "10 лет гарантии" },
];

export function Process({ index = "05" }: { index?: string }) {
  return (
    <Section className="border-y border-line bg-ink-2">
      <SectionHeader index={index} eyebrow="Как мы работаем" title="Шесть шагов от разговора до ключей" />
      <ol className="grid gap-x-10 gap-y-14 md:grid-cols-2 lg:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal as="li" key={s.t} delay={(i % 3) * 90} className="relative">
            <div className="flex items-center gap-4">
              <span className="flex h-11 w-11 items-center justify-center border border-line-strong text-sm">{i + 1}</span>
              <span className="h-px flex-1 bg-line" />
              <span className="text-xs tracking-[0.14em] text-mute uppercase">{s.time}</span>
            </div>
            <h3 className="h-card mt-7 text-2xl">{s.t}</h3>
            <p className="mt-3 max-w-sm text-[15px] leading-relaxed text-mute">{s.d}</p>
          </Reveal>
        ))}
      </ol>
    </Section>
  );
}
