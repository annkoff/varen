import Link from "next/link";
import type { ReviewWithProject } from "@/lib/catalog";

export function Stars({ value }: { value: number }) {
  return (
    <span className="flex gap-1" aria-label={`Оценка ${value} из 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < value ? "h-px w-4 bg-sand" : "h-px w-4 bg-line-strong"} />
      ))}
    </span>
  );
}

export function ReviewCard({ review }: { review: ReviewWithProject }) {
  return (
    <figure className="flex h-full flex-col border-t border-line-strong pt-8">
      <Stars value={review.rating} />
      <blockquote className="mt-8 flex-1 text-[1.05rem] font-light leading-relaxed text-paper/85">«{review.text}»</blockquote>
      <figcaption className="mt-8 flex items-end justify-between gap-4 text-sm">
        <span>
          <span className="block text-paper">{review.authorName}</span>
          <span className="text-mute">{review.authorCity}</span>
        </span>
        {review.project && (
          <Link href={`/projects/${review.project.slug}`} className="link-underline shrink-0 text-right text-xs tracking-wide text-mute hover:text-paper">
            {review.project.title}
          </Link>
        )}
      </figcaption>
    </figure>
  );
}
