import clsx from "clsx";
import Image from "next/image";
import { blurProps } from "@/lib/images";

/**
 * Darkened, semi-transparent photo behind a section: the house is visible as atmosphere,
 * the text on top stays readable (overlay + gradient to the page color at the edges).
 */
export function BgPhoto({
  src,
  opacity = 0.35,
  position = "center",
  priority,
  className,
}: {
  src: string;
  /** Visibility of the photo, 0–1. */
  opacity?: number;
  position?: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div aria-hidden className={clsx("pointer-events-none absolute inset-0 -z-10 overflow-hidden", className)}>
      <Image
        src={src}
        alt=""
        fill
        sizes="100vw"
        quality={85}
        priority={priority}
        className="object-cover"
        style={{ opacity, objectPosition: position }}
        {...blurProps(src)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/20 to-ink" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/60 via-ink/10 to-ink/40" />
    </div>
  );
}
