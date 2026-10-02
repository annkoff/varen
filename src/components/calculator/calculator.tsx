"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AREA_PRESETS,
  CALC_LIMITS,
  DEFAULT_INPUT,
  calculate,
  type CalculatorInput,
  type MaterialId,
  type PackageId,
  type PricingConfig,
  type TreeSize,
} from "@/lib/calculator";
import { formatNumber, formatRub } from "@/lib/format";
import { track } from "@/lib/analytics/client";
import { loadCalc, saveCalc } from "./calc-storage";

export const CALC_DISCLAIMER =
  "Расчёт является предварительным. Точная стоимость определяется после уточнения проекта, материалов и состава работ.";

type Extras = CalculatorInput["extras"];
type ToggleKey = "design" | "architecture" | "engineering" | "landscape" | "gazebo";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v || 0)));

export function Calculator({ pricing, initial }: { pricing: PricingConfig; initial?: Partial<Pick<CalculatorInput, "area" | "floors" | "material" | "package">> }) {
  const router = useRouter();
  const [input, setInput] = useState<CalculatorInput>(() => ({ ...DEFAULT_INPUT, ...initial }));
  const [areaText, setAreaText] = useState(String(input.area));
  const started = useRef(false);
  const changeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // The mobile total bar is shown only while the calculator is on screen.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "0px 0px -30% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Restore the previous calculation (URL params from a project page take priority).
  useEffect(() => {
    const saved = loadCalc();
    if (saved && !initial) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser-only storage is read after hydration
      setInput(saved.input);
      setAreaText(String(saved.input.area));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = useMemo(() => calculate(input, pricing), [input, pricing]);

  function update(field: string, fn: (prev: CalculatorInput) => CalculatorInput) {
    setInput((prev) => {
      const next = fn(prev);
      saveCalc(next, true);
      return next;
    });
    if (!started.current) {
      started.current = true;
      track("calculator_start");
    }
    clearTimeout(changeTimer.current);
    changeTimer.current = setTimeout(() => track("calculator_change", { label: field }), 600);
  }

  const setExtra = <K extends keyof Extras>(key: K, value: Extras[K]) => update(`extras.${key}`, (p) => ({ ...p, extras: { ...p.extras, [key]: value } }));

  function commitArea(text: string) {
    const n = clamp(Number(text.replace(",", ".")), CALC_LIMITS.area.min, CALC_LIMITS.area.max);
    setAreaText(String(n));
    update("area", (p) => ({ ...p, area: n }));
  }

  function goToRequest() {
    saveCalc(input, true);
    track("cta_click", { label: "calculator_request" });
    router.push("/request?from=calculator");
  }

  const toggles: Array<[ToggleKey, string, string]> = [
    ["design", "Дизайн-проект интерьера", `${formatRub(pricing.extras.designPerM2)}/м²`],
    ["architecture", "Архитектурный проект", `${formatRub(pricing.extras.architecturePerM2)}/м²`],
    ["engineering", "Инженерные системы", `${formatRub(pricing.extras.engineeringPerM2)}/м²`],
    ["landscape", "Ландшафтный проект", formatRub(pricing.extras.landscapeProject)],
    ["gazebo", "Беседка", `от ${formatRub(pricing.extras.gazeboFrom)}`],
  ];

  return (
    <div ref={rootRef} className="grid gap-12 lg:grid-cols-12 lg:gap-16">
      <div className="min-w-0 space-y-14 lg:col-span-7">
        {/* 1. Area */}
        <Step n="01" title="Площадь дома">
          <div className="flex flex-wrap gap-2">
            {AREA_PRESETS.map((a) => (
              <button key={a} type="button" className="chip" aria-pressed={input.area === a} onClick={() => { setAreaText(String(a)); update("area", (p) => ({ ...p, area: a })); }}>
                {a} м²
              </button>
            ))}
          </div>
          <div className="mt-6 grid items-end gap-6 sm:grid-cols-[1fr_160px]">
            <input
              type="range"
              min={50}
              max={600}
              step={5}
              value={Math.min(600, input.area)}
              onChange={(e) => { setAreaText(e.target.value); update("area", (p) => ({ ...p, area: Number(e.target.value) })); }}
              className="w-full accent-[var(--color-sand)]"
              aria-label="Площадь, ползунок"
            />
            <label className="block">
              <span className="field-label">Своё значение, м²</span>
              <input
                inputMode="numeric"
                className="field text-xl"
                value={areaText}
                onChange={(e) => setAreaText(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                onBlur={(e) => commitArea(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitArea((e.target as HTMLInputElement).value)}
                aria-describedby="area-hint"
              />
            </label>
          </div>
          <p id="area-hint" className="mt-2 text-xs text-dim">
            От {CALC_LIMITS.area.min} до {formatNumber(CALC_LIMITS.area.max)} м²
          </p>
        </Step>

        {/* 2. Floors */}
        <Step n="02" title="Этажность">
          <div className="flex flex-wrap gap-2">
            {([1, 2, 3] as const).map((f) => (
              <button key={f} type="button" className="chip" aria-pressed={input.floors === f} onClick={() => update("floors", (p) => ({ ...p, floors: f }))}>
                {f} {f === 1 ? "этаж" : "этажа"}
              </button>
            ))}
          </div>
        </Step>

        {/* 3. Material */}
        <Step n="03" title="Материал стен">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(pricing.materials) as MaterialId[]).map((m) => (
              <button key={m} type="button" className="chip" aria-pressed={input.material === m} onClick={() => update("material", (p) => ({ ...p, material: m }))}>
                {pricing.materials[m].label}
              </button>
            ))}
          </div>
          {input.material === "other" && <p className="mt-3 text-sm text-mute">Опишите материал в заявке — посчитаем индивидуально.</p>}
        </Step>

        {/* 4. Package */}
        <Step n="04" title="Комплектация">
          <div className="grid gap-px bg-line sm:grid-cols-3">
            {(Object.keys(pricing.packages) as PackageId[]).map((k) => {
              const pkg = pricing.packages[k];
              const active = input.package === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update("package", (p) => ({ ...p, package: k }))}
                  className={clsx("flex flex-col p-6 text-left transition-colors duration-300", active ? "bg-paper text-ink" : "bg-ink hover:bg-ink-3")}
                >
                  <span className="text-[11px] tracking-[0.18em] uppercase opacity-70">{pkg.label}</span>
                  <span className="mt-4 text-xl font-light">
                    от {formatRub(pkg.pricePerM2)}
                    <span className="text-sm opacity-60">/м²</span>
                  </span>
                  <span className={clsx("mt-3 text-[13px] leading-relaxed", active ? "text-ink/70" : "text-mute")}>{pkg.description}</span>
                </button>
              );
            })}
          </div>
        </Step>

        {/* 5. Extras */}
        <Step n="05" title="Дополнительные работы">
          <div className="border-t border-line">
            {toggles.map(([key, label, price]) => (
              <Toggle key={key} label={label} price={price} checked={input.extras[key]} onChange={(v) => setExtra(key, v)} />
            ))}

            <Toggle label="Газон" price={`${formatRub(pricing.extras.lawnPerM2)}/м²`} checked={input.extras.lawn.enabled} onChange={(v) => setExtra("lawn", { ...input.extras.lawn, enabled: v })}>
              <NumberField label="Площадь газона, м²" value={input.extras.lawn.area} min={CALC_LIMITS.lawn.min} max={CALC_LIMITS.lawn.max} onChange={(n) => setExtra("lawn", { ...input.extras.lawn, area: n })} />
            </Toggle>

            <Toggle label="Деревья и озеленение" price="по параметрам" checked={input.extras.greenery.enabled} onChange={(v) => setExtra("greenery", { ...input.extras.greenery, enabled: v })}>
              <div className="grid gap-5 sm:grid-cols-3">
                <label className="block sm:col-span-3">
                  <span className="field-label">Размер деревьев</span>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(pricing.extras.trees) as TreeSize[]).map((t) => (
                      <button key={t} type="button" className="chip text-[13px]" aria-pressed={input.extras.greenery.treeSize === t} onClick={() => setExtra("greenery", { ...input.extras.greenery, treeSize: t })}>
                        {pricing.extras.trees[t].label} · {formatRub(pricing.extras.trees[t].price)}
                      </button>
                    ))}
                  </div>
                </label>
                <NumberField label="Деревьев, шт." value={input.extras.greenery.trees} min={CALC_LIMITS.trees.min} max={CALC_LIMITS.trees.max} onChange={(n) => setExtra("greenery", { ...input.extras.greenery, trees: n })} />
                <NumberField label={`Кустарников, шт. (${formatRub(pricing.extras.shrubPrice)})`} value={input.extras.greenery.shrubs} min={CALC_LIMITS.shrubs.min} max={CALC_LIMITS.shrubs.max} onChange={(n) => setExtra("greenery", { ...input.extras.greenery, shrubs: n })} />
              </div>
            </Toggle>

            <Toggle label="Освещение участка" price={`${formatRub(pricing.extras.lightingPoint)}/точка`} checked={input.extras.lighting.enabled} onChange={(v) => setExtra("lighting", { ...input.extras.lighting, enabled: v })}>
              <NumberField label="Светильников, шт." value={input.extras.lighting.points} min={CALC_LIMITS.lighting.min} max={CALC_LIMITS.lighting.max} onChange={(n) => setExtra("lighting", { ...input.extras.lighting, points: n })} />
            </Toggle>

            <Toggle label="Терраса" price={`${formatRub(pricing.extras.terracePerM2)}/м²`} checked={input.extras.terrace.enabled} onChange={(v) => setExtra("terrace", { ...input.extras.terrace, enabled: v })}>
              <NumberField label="Площадь террасы, м²" value={input.extras.terrace.area} min={CALC_LIMITS.terrace.min} max={CALC_LIMITS.terrace.max} onChange={(n) => setExtra("terrace", { ...input.extras.terrace, area: n })} />
            </Toggle>

            <Toggle label="Другие работы" price="индивидуально" checked={input.extras.other.enabled} onChange={(v) => setExtra("other", { ...input.extras.other, enabled: v })}>
              <label className="block">
                <span className="field-label">Что ещё нужно</span>
                <input className="field" maxLength={300} placeholder="Баня, бассейн, гараж, забор…" value={input.extras.other.note} onChange={(e) => setExtra("other", { ...input.extras.other, note: e.target.value })} />
              </label>
            </Toggle>
          </div>
        </Step>
      </div>

      {/* Result */}
      <aside className="lg:col-span-5" aria-live="polite">
        <div className="border border-line-strong bg-ink-2 p-7 md:p-10 lg:sticky lg:top-28">
          <p className="eyebrow">Предварительная стоимость</p>
          <p className="mt-4 text-[clamp(2.4rem,5vw,3.6rem)] font-light leading-none tracking-tight tabular-nums" data-testid="calc-total">
            {formatRub(result.total)}
          </p>
          {result.hasIndividual && <p className="mt-2 text-xs text-mute">+ работы, которые считаются индивидуально</p>}

          <dl className="mt-8 border-t border-line text-sm">
            {[result.base, ...result.extras].map((l) => (
              <div key={l.id} className="border-b border-line py-3">
                <div className="flex justify-between gap-4">
                  <dt>{l.label}</dt>
                  <dd className="shrink-0 tabular-nums">{l.amount ? formatRub(l.amount) : "—"}</dd>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-dim">{l.detail}</p>
              </div>
            ))}
          </dl>

          <p className="mt-6 text-xs leading-relaxed text-mute">{CALC_DISCLAIMER}</p>

          <button type="button" onClick={goToRequest} className="btn btn-primary mt-8 w-full" data-testid="calc-request">
            Оставить заявку с расчётом
          </button>
          <p className="mt-3 text-center text-xs text-dim">Параметры расчёта автоматически попадут в заявку</p>
        </div>
      </aside>

      {/* Mobile sticky total */}
      <div
        className={clsx(
          "fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-4 border-t border-line-strong bg-ink/95 px-5 py-3 backdrop-blur transition-transform duration-500 lg:hidden",
          inView ? "translate-y-0" : "translate-y-full"
        )}
        aria-hidden={!inView}
      >
        <div>
          <p className="text-[10px] tracking-[0.18em] text-mute uppercase">Предварительно</p>
          <p className="text-lg font-light tabular-nums">{formatRub(result.total)}</p>
        </div>
        <button type="button" onClick={goToRequest} className="btn btn-primary btn-sm">
          В заявку
        </button>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-6 flex items-baseline gap-4">
        <span className="text-xs tracking-[0.2em] text-sand">{n}</span>
        <span className="text-2xl font-light tracking-tight">{title}</span>
      </legend>
      {children}
    </fieldset>
  );
}

function Toggle({ label, price, checked, onChange, children }: { label: string; price: string; checked: boolean; onChange: (v: boolean) => void; children?: React.ReactNode }) {
  return (
    <div className="border-b border-line">
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 py-4 text-left">
        <span className="flex items-center gap-4">
          <span className={clsx("flex h-5 w-5 shrink-0 items-center justify-center border transition-colors", checked ? "border-paper bg-paper text-ink" : "border-line-strong")}>
            {checked && (
              <svg viewBox="0 0 12 10" className="h-2.5 w-3" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                <path d="M1 5l3.5 3.5L11 1" />
              </svg>
            )}
          </span>
          <span className="text-[15px]">{label}</span>
        </span>
        <span className="text-right text-sm text-mute">{price}</span>
      </button>
      {checked && children && <div className="pb-6 pl-9 animate-fade">{children}</div>}
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  const [text, setText] = useState(String(value));
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setText(String(value));
  }
  const commit = (t: string) => {
    const n = clamp(Number(t), min, max);
    setText(String(n));
    onChange(n);
  };
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input
        inputMode="numeric"
        className="field"
        value={text}
        onChange={(e) => {
          const t = e.target.value.replace(/[^\d]/g, "").slice(0, 6);
          setText(t);
          const n = Number(t);
          if (t && n >= min && n <= max) onChange(n);
        }}
        onBlur={(e) => commit(e.target.value)}
      />
    </label>
  );
}
