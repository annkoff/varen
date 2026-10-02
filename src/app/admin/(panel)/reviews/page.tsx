import { ReviewForm } from "@/components/admin/review-form";
import { AdminHeader, Badge, Card } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { deleteReview } from "./actions";

export const metadata = { title: "Отзывы" };

export default async function AdminReviewsPage() {
  const [reviews, projects] = await Promise.all([
    db.review.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], include: { project: { select: { title: true } } } }),
    db.project.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, title: true } }),
  ]);
  return (
    <>
      <AdminHeader title="Отзывы" text="Отзывы с пометкой «Демо» — тестовый контент. Перед запуском замените их реальными." />
      <Card title="Новый отзыв" className="mb-6">
        <ReviewForm projects={projects} />
      </Card>
      <div className="space-y-4">
        {reviews.map((r) => (
          <Card
            key={r.id}
            title={`${r.authorName}, ${r.authorCity}`}
            action={
              <div className="flex items-center gap-2">
                {r.isDemo && <Badge tone="warn">демо</Badge>}
                {r.published ? <Badge tone="ok">на сайте</Badge> : <Badge>скрыт</Badge>}
                <form action={deleteReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="text-xs text-err hover:underline">Удалить</button>
                </form>
              </div>
            }
          >
            <ReviewForm review={r} projects={projects} />
          </Card>
        ))}
      </div>
    </>
  );
}
