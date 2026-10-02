import clsx from "clsx";
import Link from "next/link";
import { BgPhoto } from "./bg-photo";
import { Reveal } from "./reveal";

export function Arrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 10" className={clsx("h-2.5 w-6 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth={1.2} aria-hidden>
      <path d="M0 5h23M18.5 0.5 23 5l-4.5 4.5" />
    </svg>
  );
}

type BtnVariant = "primary" | "outline" | "ghost";

export function ButtonLink({
  href,
  children,
  variant = "primary",
  cta,
  className,
  arrow = true,
  small,
}: {
  href: string;
  children: React.ReactNode;
  variant?: BtnVariant;
  /** Name of the CTA for analytics (data-cta). */
  cta?: string;
  className?: string;
  arrow?: boolean;
  small?: boolean;
}) {
  return (
    <Link href={href} data-cta={cta} className={clsx("btn group", `btn-${variant}`, small && "btn-sm", className)}>
      <span>{children}</span>
      {arrow && <Arrow className="transition-transform duration-500 group-hover:translate-x-1" />}
    </Link>
  );
}

export function SectionHeader({
  index,
  eyebrow,
  title,
  text,
  action,
  className,
}: {
  index?: string;
  eyebrow: string;
  title: React.ReactNode;
  text?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Reveal className={clsx("mb-12 grid gap-8 md:mb-16 lg:grid-cols-12 lg:items-end", className)}>
      <div className="lg:col-span-7">
        <p className="eyebrow mb-6 flex items-center gap-4">
          {index && <span className="text-paper">{index}</span>}
          {index && <span className="h-px w-10 bg-line-strong" />}
          <span>{eyebrow}</span>
        </p>
        <h2 className="h-section">{title}</h2>
      </div>
      {(text || action) && (
        <div className="flex flex-col gap-6 lg:col-span-5 lg:items-start lg:pb-2">
          {text && <p className="lead-text max-w-md">{text}</p>}
          {action}
        </div>
      )}
    </Reveal>
  );
}

export function Section({ children, className, id, bg, bgOpacity }: { children: React.ReactNode; className?: string; id?: string; bg?: string; bgOpacity?: number }) {
  return (
    <section id={id} className={clsx("py-24 md:py-32", bg && "relative isolate", className)}>
      {bg && <BgPhoto src={bg} opacity={bgOpacity ?? 0.38} />}
      <div className="container-x">{children}</div>
    </section>
  );
}

/** Page title block. `bg` — a darkened, semi-transparent house photo behind the text. */
export function PageHero({ eyebrow, title, text, bg }: { eyebrow: string; title: React.ReactNode; text?: React.ReactNode; bg?: string }) {
  return (
    <header className="relative isolate overflow-hidden border-b border-line pt-36 pb-16 md:pt-48 md:pb-24">
      {bg && <BgPhoto src={bg} opacity={0.62} priority />}
      <div className="container-x">
        <p className="eyebrow mb-6 animate-hero">{eyebrow}</p>
        <h1 className="display max-w-5xl text-[clamp(2.6rem,7vw,6.5rem)] animate-hero" style={{ animationDelay: "80ms" }}>
          {title}
        </h1>
        {text && (
          <p className="lead-text mt-8 max-w-2xl animate-hero" style={{ animationDelay: "160ms" }}>
            {text}
          </p>
        )}
      </div>
    </header>
  );
}

export function DemoNote({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={clsx("text-xs leading-relaxed text-dim", className)}>{children}</p>;
}
