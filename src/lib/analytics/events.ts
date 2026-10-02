/** First-party event types. The same names are sent to Yandex Metrika as goals. */
export const EVENT_TYPES = [
  "page_view",
  "cta_click",
  "phone_click",
  "email_click",
  "project_view",
  "gallery_open",
  "calculator_start",
  "calculator_change",
  "form_start",
  "form_submit",
  "contacts_open",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_LABELS: Record<EventType, string> = {
  page_view: "Просмотры страниц",
  cta_click: "Клики по CTA",
  phone_click: "Клики по телефону",
  email_click: "Клики по email",
  project_view: "Просмотры проектов",
  gallery_open: "Открытия галереи",
  calculator_start: "Начало расчёта",
  calculator_change: "Изменения калькулятора",
  form_start: "Начало заполнения формы",
  form_submit: "Отправки формы",
  contacts_open: "Открытия контактов",
};

export interface Attribution {
  source: string;
  ref?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  landingPage: string;
  referrer?: string;
  ts: number;
}

const SEARCH_ENGINES: Array<[RegExp, string]> = [
  [/(^|\.)yandex\./, "yandex"],
  [/(^|\.)ya\.ru$/, "yandex"],
  [/(^|\.)google\./, "google"],
  [/(^|\.)bing\.com$/, "bing"],
  [/(^|\.)mail\.ru$/, "mail.ru"],
  [/(^|\.)vk\.com$/, "vk"],
  [/(^|\.)t\.me$/, "telegram"],
  [/(^|\.)instagram\.com$/, "instagram"],
  [/(^|\.)dzen\.ru$/, "dzen"],
];

/** ref code > utm_source > external referrer > direct */
export function resolveSource(p: { ref?: string | null; utmSource?: string | null; referrer?: string | null; host?: string }): string {
  if (p.ref) return `ref:${p.ref}`;
  if (p.utmSource) return p.utmSource.toLowerCase().slice(0, 60);
  if (p.referrer) {
    try {
      const host = new URL(p.referrer).hostname.replace(/^www\./, "");
      if (p.host && host === p.host.replace(/^www\./, "")) return "direct";
      for (const [re, name] of SEARCH_ENGINES) if (re.test(host)) return name;
      return host.slice(0, 60);
    } catch {
      return "direct";
    }
  }
  return "direct";
}

export const REF_CODE_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
