"use client";

import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { LEAD_SERVICES } from "@/content/services";
import { REGIONS } from "@/content/site";
import { calculate, describeInput, type CalculatorInput, type PricingConfig } from "@/lib/calculator";
import { getAttribution, getVisitorId, track } from "@/lib/analytics/client";
import { leadFieldsSchema } from "@/lib/leads/schema";
import { formatRub } from "@/lib/format";
import { detachCalc, loadCalc } from "@/components/calculator/calc-storage";
import { CALC_DISCLAIMER } from "@/components/calculator/calculator";
import { FileUploader, type UploadItem } from "./file-uploader";

type Errors = Partial<Record<string, string>>;

interface Props {
  pricing: PricingConfig;
  maxMb: number;
  initialServices?: string[];
  initialDescription?: string;
  compact?: boolean;
}

function newFormId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
}

export function LeadForm({ pricing, maxMb, initialServices = [], initialDescription = "", compact }: Props) {
  const router = useRouter();
  const [formId] = useState(newFormId);
  const [renderedAt] = useState(() => Date.now());
  const [values, setValues] = useState({ name: "", phone: "", email: "", region: "", area: "", description: initialDescription });
  const [services, setServices] = useState<string[]>(initialServices);
  const [consent, setConsent] = useState(false);
  const [files, setFiles] = useState<UploadItem[]>([]);
  const [calc, setCalc] = useState<CalculatorInput | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const started = useRef(false);
  const honeypot = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadCalc();
    if (saved?.attached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading browser-only storage after hydration
      setCalc(saved.input);
      setValues((v) => (v.area ? v : { ...v, area: String(saved.input.area) }));
      setServices((s) => (s.length ? s : ["construction"]));
    }
  }, []);

  const calcResult = useMemo(() => (calc ? calculate(calc, pricing) : null), [calc, pricing]);
  const uploading = files.some((f) => f.status === "uploading");

  function onFirstInteraction() {
    if (started.current) return;
    started.current = true;
    track("form_start");
  }

  const set = (k: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submittingRef.current) return; // double-click guard (server is idempotent too)
    setFormError(null);

    const check = leadFieldsSchema.safeParse({ ...values, services, consent });
    if (!check.success) {
      const errs: Errors = {};
      for (const i of check.error.issues) errs[String(i.path[0])] ??= i.message;
      setErrors(errs);
      document.querySelector<HTMLElement>(`[name="${Object.keys(errs)[0]}"]`)?.focus();
      return;
    }
    if (uploading) {
      setFormError("Дождитесь окончания загрузки файлов");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ...values,
          services,
          consent,
          formId,
          visitorId: getVisitorId(),
          calculator: calc,
          attribution: getAttribution(),
          website: honeypot.current?.value ?? "",
          elapsedMs: Date.now() - renderedAt,
        }),
      });
      const json = (await res.json().catch(() => ({}))) as { id?: number; error?: string; fieldErrors?: Errors };
      if (!res.ok || !json.id) {
        if (json.fieldErrors) setErrors(json.fieldErrors);
        setFormError(json.error ?? "Не удалось отправить заявку. Попробуйте ещё раз.");
        submittingRef.current = false;
        setSubmitting(false);
        return;
      }
      track("form_submit", { label: calc ? "with_calculator" : "plain" });
      if (calc) detachCalc();
      router.push(`/request/success?n=${json.id}`);
    } catch {
      setFormError("Нет соединения с сервером. Проверьте интернет и попробуйте ещё раз.");
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  const fieldProps = (k: keyof typeof values) => ({
    name: k,
    value: values[k],
    onChange: set(k),
    "aria-invalid": errors[k] ? true : undefined,
    "aria-describedby": errors[k] ? `${k}-error` : undefined,
    disabled: submitting,
  });

  return (
    <form onSubmit={onSubmit} onFocus={onFirstInteraction} noValidate className="space-y-10" data-testid="lead-form">
      {calc && calcResult && (
        <div className="border border-line-strong bg-ink-2 p-6 md:p-8" data-testid="calc-summary">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Параметры из калькулятора</p>
              <p className="mt-3 text-sm text-mute">Предварительная стоимость</p>
              <p className="text-3xl font-light tabular-nums">{formatRub(calcResult.total)}</p>
            </div>
            <button
              type="button"
              className="text-xs text-mute underline-offset-4 hover:text-paper hover:underline"
              onClick={() => {
                detachCalc();
                setCalc(null);
              }}
            >
              Убрать расчёт
            </button>
          </div>
          <dl className="mt-6 grid gap-x-8 border-t border-line pt-4 text-sm sm:grid-cols-2">
            {describeInput(calc, pricing).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line py-2">
                <dt className="text-mute">{k}</dt>
                <dd className="text-right">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-xs text-dim">{CALC_DISCLAIMER}</p>
          <Link href="/prices#calculator" className="mt-3 inline-block text-xs text-sand-2 hover:underline">
            Изменить расчёт
          </Link>
        </div>
      )}

      <div className={clsx("grid gap-x-8 gap-y-8", !compact && "md:grid-cols-2")}>
        <Field label="Имя *" error={errors.name} id="name">
          <input id="name" autoComplete="name" className="field" placeholder="Как к вам обращаться" maxLength={80} {...fieldProps("name")} />
        </Field>
        <Field label="Телефон *" error={errors.phone} id="phone">
          <input id="phone" type="tel" autoComplete="tel" inputMode="tel" className="field" placeholder="+7 900 000-00-00" maxLength={25} {...fieldProps("phone")} />
        </Field>
        <Field label="Email" error={errors.email} id="email">
          <input id="email" type="email" autoComplete="email" className="field" placeholder="name@example.com" maxLength={120} {...fieldProps("email")} />
        </Field>
        <Field label="Регион *" error={errors.region} id="region">
          <input id="region" list="regions" className="field" placeholder="Где участок" maxLength={80} autoComplete="address-level1" {...fieldProps("region")} />
          <datalist id="regions">
            {REGIONS.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </Field>
      </div>

      <fieldset>
        <legend className="field-label">Услуги</legend>
        <div className="flex flex-wrap gap-2">
          {LEAD_SERVICES.map((s) => {
            const on = services.includes(s.id);
            return (
              <button
                key={s.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                disabled={submitting}
                className="chip text-[13px]"
                onClick={() => setServices((prev) => (on ? prev.filter((x) => x !== s.id) : [...prev, s.id]))}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className={clsx("grid gap-x-8 gap-y-8", !compact && "md:grid-cols-[200px_1fr]")}>
        <Field label="Площадь, м²" error={errors.area} id="area">
          <input id="area" inputMode="numeric" className="field" placeholder="150" maxLength={5} {...fieldProps("area")} onChange={(e) => setValues((v) => ({ ...v, area: e.target.value.replace(/\D/g, "") }))} />
        </Field>
        <Field label="Описание" error={errors.description} id="description">
          <textarea id="description" className="field" rows={4} maxLength={3000} placeholder="Участок, сроки, пожелания, ссылки на референсы" {...fieldProps("description")} />
        </Field>
      </div>

      <div>
        <p className="field-label">Файлы</p>
        <FileUploader formId={formId} maxMb={maxMb} items={files} onChange={setFiles} disabled={submitting} />
      </div>

      {/* Honeypot — hidden from people, tempting for bots */}
      <div aria-hidden className="pointer-events-none absolute left-0 top-0 h-px w-px overflow-hidden opacity-0 [clip-path:inset(50%)]">
        <label>
          Сайт
          <input ref={honeypot} type="text" name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="flex cursor-pointer items-start gap-4 text-sm leading-relaxed text-paper/80">
          <input
            type="checkbox"
            name="consent"
            checked={consent}
            disabled={submitting}
            onChange={(e) => {
              setConsent(e.target.checked);
              setErrors((er) => ({ ...er, consent: undefined }));
            }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-sand)]"
            aria-invalid={errors.consent ? true : undefined}
          />
          <span>
            Согласен(на) на обработку персональных данных в соответствии с{" "}
            <Link href="/privacy" target="_blank" className="underline underline-offset-4 hover:text-paper">
              политикой конфиденциальности
            </Link>
          </span>
        </label>
        {errors.consent && <p className="field-error">{errors.consent}</p>}
      </div>

      {formError && (
        <p role="alert" className="border border-err/40 bg-err/10 px-4 py-3 text-sm text-err">
          {formError}
        </p>
      )}

      <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={submitting || uploading} data-testid="lead-submit">
        {submitting ? (
          <>
            <span className="h-4 w-4 animate-spin rounded-full border border-ink/30 border-t-ink" aria-hidden />
            Отправляем…
          </>
        ) : uploading ? (
          "Загружаем файлы…"
        ) : (
          "Отправить заявку"
        )}
      </button>
    </form>
  );
}

function Field({ label, error, id, children }: { label: string; error?: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="field-error">
          {error}
        </p>
      )}
    </div>
  );
}
