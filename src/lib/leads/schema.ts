import { z } from "zod";
import { LEAD_SERVICES } from "@/content/services";
import { calculatorInputSchema } from "../calculator/schema";

const serviceIds = LEAD_SERVICES.map((s) => s.id) as [string, ...string[]];

/** Normalises Russian phone input to +7XXXXXXXXXX where possible. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && (digits[0] === "8" || digits[0] === "7")) return `+7${digits.slice(1)}`;
  if (digits.length === 10 && digits[0] === "9") return `+7${digits}`;
  return raw.trim().startsWith("+") ? `+${digits}` : digits;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const leadFieldsSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(80, "Слишком длинное имя"),
  phone: z
    .string()
    .trim()
    .transform(normalizePhone)
    .refine((v) => /^\+?\d{10,15}$/.test(v), "Проверьте номер телефона"),
  email: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Проверьте email"),
  region: z.string().trim().min(2, "Укажите регион").max(80),
  services: z.array(z.enum(serviceIds)).max(serviceIds.length).default([]),
  area: z
    .union([z.literal(""), z.coerce.number().int("Целое число").min(10, "Минимум 10 м²").max(5000, "Максимум 5000 м²")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  description: optionalText(3000),
  consent: z.literal(true, { error: "Нужно согласие на обработку персональных данных" }),
});

export const attributionPayloadSchema = z
  .object({
    source: z.string().max(80).optional(),
    ref: z.string().max(40).optional(),
    utmSource: z.string().max(120).optional(),
    utmMedium: z.string().max(120).optional(),
    utmCampaign: z.string().max(120).optional(),
    utmContent: z.string().max(120).optional(),
    utmTerm: z.string().max(120).optional(),
    landingPage: z.string().max(300).optional(),
    referrer: z.string().max(300).optional(),
    ts: z.number().optional(),
  })
  .partial();

export const leadPayloadSchema = leadFieldsSchema.extend({
  formId: z.string().uuid(),
  visitorId: z.string().uuid().optional(),
  calculator: calculatorInputSchema.nullable().optional(),
  attribution: attributionPayloadSchema.nullable().optional(),
  /** Honeypot: real users never see this field. */
  website: z.string().max(0).optional().or(z.literal("")),
  /** ms between form render and submit — bots submit instantly. */
  elapsedMs: z.number().int().min(0).optional(),
});

export type LeadFields = z.input<typeof leadFieldsSchema>;
export type LeadPayload = z.infer<typeof leadPayloadSchema>;
