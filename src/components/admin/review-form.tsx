"use client";

import type { Review } from "@prisma/client";
import { useActionState } from "react";
import { saveReview, type ReviewState } from "@/app/admin/(panel)/reviews/actions";

export function ReviewForm({ review, projects }: { review?: Review; projects: Array<{ id: string; title: string }> }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(saveReview, undefined);
  return (
    <form action={action} className="space-y-3">
      {review && <input type="hidden" name="id" value={review.id} />}
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px]">
        <input name="authorName" defaultValue={review?.authorName} placeholder="Имя" className="field-box" required maxLength={80} />
        <input name="authorCity" defaultValue={review?.authorCity} placeholder="Город" className="field-box" required maxLength={80} />
        <select name="rating" defaultValue={review?.rating ?? 5} className="field-box" aria-label="Оценка">
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r} ★
            </option>
          ))}
        </select>
      </div>
      <textarea name="text" defaultValue={review?.text} rows={4} placeholder="Текст отзыва" className="field-box" required minLength={20} maxLength={2000} />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <select name="projectId" defaultValue={review?.projectId ?? ""} className="field-box sm:max-w-xs" aria-label="Проект">
          <option value="">Без привязки к проекту</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={review?.published ?? true} className="h-4 w-4 accent-[var(--color-sand)]" /> Опубликован
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isDemo" defaultChecked={review?.isDemo ?? false} className="h-4 w-4 accent-[var(--color-sand)]" /> Демо
        </label>
        <button className="btn btn-primary btn-sm sm:ml-auto" disabled={pending}>
          {pending ? "Сохраняем…" : review ? "Сохранить" : "Добавить отзыв"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-err">{state.error}</p>}
      {state?.ok && <p className="text-sm text-ok">Сохранено</p>}
    </form>
  );
}
