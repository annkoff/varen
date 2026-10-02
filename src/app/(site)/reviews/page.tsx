import type { Metadata } from "next";
import { ReviewCard } from "@/components/reviews/review-card";
import { CtaBand } from "@/components/sections/cta-band";
import { DemoNote, PageHero } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { getReviews } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Отзывы",
  description: "Отзывы заказчиков VAREN о строительстве домов, отделке и благоустройстве.",
  alternates: { canonical: "/reviews" },
};

export default async function ReviewsPage() {
  const reviews = await getReviews();
  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  return (
    <>
      <PageHero eyebrow="Отзывы" title="Говорят те, кто уже живёт в своём доме" text="Хорошее и не очень — мы публикуем отзывы целиком. Часть из них привязана к проектам: можно открыть и посмотреть, о каком доме речь." />
      <section className="py-16 md:py-24">
        <div className="container-x">
          {reviews.length > 0 && (
            <div className="mb-16 flex flex-wrap items-end gap-x-16 gap-y-6 border-b border-line pb-10">
              <div>
                <p className="text-6xl font-light tracking-tight">{avg.toFixed(1).replace(".", ",")}</p>
                <p className="mt-2 text-sm text-mute">средняя оценка</p>
              </div>
              <div>
                <p className="text-6xl font-light tracking-tight">{reviews.length}</p>
                <p className="mt-2 text-sm text-mute">отзывов на сайте</p>
              </div>
            </div>
          )}
          <div className="grid gap-x-10 gap-y-16 md:grid-cols-2">
            {reviews.map((r, i) => (
              <Reveal key={r.id} delay={(i % 2) * 90}>
                <ReviewCard review={r} />
              </Reveal>
            ))}
          </div>
          {reviews.length === 0 && <p className="py-16 text-center text-mute">Отзывов пока нет.</p>}
          <DemoNote className="mt-16 max-w-2xl">
            Важно: это тестовый проект. Все отзывы на странице вымышлены и приведены как демонстрационный контент — они не являются реальными отзывами клиентов.
          </DemoNote>
        </div>
      </section>
      <CtaBand title="Станьте следующим" />
    </>
  );
}
