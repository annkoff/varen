import { Reveal } from "@/components/ui/reveal";
import { Section, SectionHeader } from "@/components/ui/primitives";

const ITEMS = [
  { t: "Одна смета, без сюрпризов", d: "Смету расписываем до гвоздя и фиксируем в договоре. Если что-то меняется — сначала согласуем, потом делаем." },
  { t: "Свой технадзор", d: "Инженер технадзора не подчиняется прорабу. Его задача — найти ошибку раньше, чем её закроет следующий слой." },
  { t: "Фотоотчёт каждую неделю", d: "По пятницам — фото, видео и короткий отчёт: что сделано, что дальше, где нужны ваши решения." },
  { t: "Любой материал стен", d: "Газобетон, кирпич, брус, бревно, каркас, монолит. Подскажем, что подходит участку и бюджету, но выбор за вами." },
  { t: "Гарантия 10 лет на конструктив", d: "На фундамент, стены и кровлю — 10 лет, на инженерию и отделку — 3 года. Гарантия прописана в договоре." },
  { t: "Работаем по всей России", d: "Строим от Калининграда до Владивостока: свои бригады в центральных регионах и проверенные партнёры в остальных." },
];

export function Advantages({ index = "04" }: { index?: string }) {
  return (
    <Section bg="/images/backgrounds/brick-cottage.webp" bgOpacity={0.3}>
      <SectionHeader index={index} eyebrow="Почему VAREN" title={<>Двадцать лет на&nbsp;стройке учат простым вещам</>} text="Мы не обещаем «лучшее качество на рынке». Мы обещаем порядок — в смете, на площадке и в документах." />
      <div className="grid border-t border-line sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it, i) => (
          <Reveal key={it.t} delay={(i % 3) * 90} className="border-b border-line py-10 sm:px-0 sm:pr-10 lg:[&:not(:nth-child(3n))]:border-r lg:px-10 lg:[&:nth-child(3n+1)]:pl-0">
            <span className="text-xs tracking-[0.2em] text-sand">{String(i + 1).padStart(2, "0")}</span>
            <h3 className="h-card mt-6 text-xl">{it.t}</h3>
            <p className="mt-4 text-[15px] leading-relaxed text-mute">{it.d}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
