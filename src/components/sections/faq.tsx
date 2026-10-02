import { Section, SectionHeader } from "@/components/ui/primitives";

const FAQ = [
  ["Можно построить по моему проекту?", "Да. Проверим проект, посчитаем смету и при необходимости адаптируем под выбранную технологию. Авторство и решения архитектора сохраняем."],
  ["Мой дизайнер может вести интерьер?", "Конечно. Мы договариваемся о правилах на старте: кто принимает решения, как согласуются изменения, кто ведёт комплектацию. Дизайнер получает доступ к отчётам."],
  ["Из какого материала лучше строить?", "Универсального ответа нет. Газобетон — тёплый и предсказуемый, кирпич — долговечный, брус и бревно — для тех, кто любит дерево, каркас — быстро и экономно. Обсудим на встрече и покажем объекты."],
  ["Как формируется цена?", "Базово — площадь × комплектация × коэффициенты материала и этажности, плюс дополнительные работы. В калькуляторе формула видна целиком. Финальная смета составляется после проекта."],
  ["Как проходит оплата?", "По этапам: аванс на материалы этапа, затем оплата после приёмки работ. Вы не платите за то, что ещё не построено."],
  ["Вы работаете в моём регионе?", "Мы строим по всей России. В Москве, Подмосковье, Ленинградской области и на юге — собственные бригады, в остальных регионах — проверенные партнёры под нашим технадзором."],
];

export function Faq({ index = "08" }: { index?: string }) {
  return (
    <Section>
      <div className="grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeader index={index} eyebrow="Вопросы" title="Что обычно спрашивают на первой встрече" className="!mb-0 !block" />
        </div>
        <div className="border-t border-line lg:col-span-7">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-line">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-lg font-light [&::-webkit-details-marker]:hidden">
                {q}
                <span className="relative h-3 w-3 shrink-0">
                  <span className="absolute left-0 top-1/2 h-px w-3 bg-paper" />
                  <span className="absolute left-1/2 top-0 h-3 w-px bg-paper transition-transform duration-300 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="max-w-2xl pb-7 text-[15px] leading-relaxed text-mute">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </Section>
  );
}
