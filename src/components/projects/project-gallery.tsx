"use client";

import clsx from "clsx";
import Image from "next/image";
import { mosaicClasses, mosaicSizes } from "@/lib/mosaic";
import { useCallback, useEffect, useRef, useState } from "react";
import { IMAGE_CATEGORY_LABELS, type ImageCategoryKey } from "@/content/site";
import { track } from "@/lib/analytics/client";

export interface GalleryImage {
  id: string;
  url: string;
  alt: string;
  category: ImageCategoryKey;
  /** Tiny blurred preview (built on the server) shown while the photo loads. */
  blur?: string;
}

const preview = (img: GalleryImage) => (img.blur ? { placeholder: "blur" as const, blurDataURL: img.blur } : {});

export function ProjectGallery({ images, projectSlug }: { images: GalleryImage[]; projectSlug: string }) {
  const categories = (Object.keys(IMAGE_CATEGORY_LABELS) as ImageCategoryKey[]).filter((c) => images.some((i) => i.category === c));
  const [filter, setFilter] = useState<ImageCategoryKey | "ALL">("ALL");
  const [open, setOpen] = useState<number | null>(null);
  const visible = filter === "ALL" ? images : images.filter((i) => i.category === filter);

  const openAt = (i: number) => {
    setOpen(i);
    track("gallery_open", { label: projectSlug });
  };

  return (
    <div>
      <div className="-mx-5 mb-8 overflow-x-auto px-5 md:mx-0 md:px-0" role="group" aria-label="Фильтр галереи">
        <div className="flex w-max gap-2">
          {[["ALL", "Все"] as const, ...categories.map((c) => [c, IMAGE_CATEGORY_LABELS[c]] as const)].map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={filter === id}
              onClick={() => setFilter(id)}
              className="chip min-h-10 text-[13px]"
            >
              {label}
              <span className="text-[11px] opacity-60">{id === "ALL" ? images.length : images.filter((i) => i.category === id).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3">
        {visible.map((img, i) => (
          <button
            key={img.id}
            type="button"
            onClick={() => openAt(i)}
            className={clsx("img-zoom group relative overflow-hidden bg-ink-2 text-left animate-fade", mosaicClasses(i, visible.length))}
            aria-label={`Открыть фото: ${img.alt}`}
          >
            <Image src={img.url} {...preview(img)} alt={img.alt} fill sizes={mosaicSizes(i)} quality={85} className="object-cover" />
            <span className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-ink/80 to-transparent p-4 pt-10 text-xs tracking-wide text-paper/90 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
              {IMAGE_CATEGORY_LABELS[img.category]} · {img.alt}
            </span>
          </button>
        ))}
      </div>

      {open !== null && <Lightbox images={visible} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Lightbox({ images, index, onIndex, onClose }: { images: GalleryImage[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const img = images[index];
  const touchX = useRef<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const go = useCallback((d: number) => onIndex((index + d + images.length) % images.length), [index, images.length, onIndex]);

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
      prevFocus?.focus();
    };
  }, [go, onClose]);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-ink/97 animate-fade"
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр фотографий"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <div className="flex h-16 shrink-0 items-center justify-between px-5 md:px-8">
        <p className="text-xs tracking-[0.2em] text-mute">
          {String(index + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}
        </p>
        <button ref={closeRef} type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center text-paper" aria-label="Закрыть">
          <svg viewBox="0 0 16 16" className="h-4 w-4" stroke="currentColor" strokeWidth={1.2} aria-hidden>
            <path d="M1 1l14 14M15 1 1 15" />
          </svg>
        </button>
      </div>
      <div className="relative min-h-0 flex-1" onClick={onClose}>
        <Image key={img.id} src={img.url} {...preview(img)} alt={img.alt} fill sizes="100vw" quality={92} className="object-contain px-2 animate-fade md:px-20" onClick={(e) => e.stopPropagation()} />
        <button type="button" onClick={(e) => { e.stopPropagation(); go(-1); }} className="absolute left-2 top-1/2 hidden h-14 w-14 -translate-y-1/2 items-center justify-center text-paper/70 hover:text-paper md:flex" aria-label="Предыдущее фото">
          <svg viewBox="0 0 24 10" className="h-3 w-8 rotate-180" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden><path d="M0 5h23M18.5 .5 23 5l-4.5 4.5" /></svg>
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); go(1); }} className="absolute right-2 top-1/2 hidden h-14 w-14 -translate-y-1/2 items-center justify-center text-paper/70 hover:text-paper md:flex" aria-label="Следующее фото">
          <svg viewBox="0 0 24 10" className="h-3 w-8" fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden><path d="M0 5h23M18.5 .5 23 5l-4.5 4.5" /></svg>
        </button>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-5 md:px-8">
        <p className="text-sm text-paper/80">
          <span className="text-mute">{IMAGE_CATEGORY_LABELS[img.category]} · </span>
          {img.alt}
        </p>
        <div className="flex gap-2 md:hidden">
          <button type="button" onClick={() => go(-1)} className="btn btn-outline btn-sm" aria-label="Предыдущее">←</button>
          <button type="button" onClick={() => go(1)} className="btn btn-outline btn-sm" aria-label="Следующее">→</button>
        </div>
      </div>
    </div>
  );
}
