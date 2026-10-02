import "server-only";
import { cache } from "react";
import { z } from "zod";
import { db } from "./db";
import { DEFAULT_CONTACTS, type Contacts } from "@/content/site";
import { DEFAULT_PRICING, type PricingConfig } from "./calculator";

export const contactsSchema = z.object({
  phone: z.string().trim().min(5).max(40),
  phoneHref: z.string().trim().regex(/^\+?\d{7,15}$/, "Только цифры, можно с +"),
  email: z.string().trim().email().max(120),
  address: z.string().trim().min(3).max(200),
  hours: z.string().trim().max(120),
  hoursNote: z.string().trim().max(200),
});

const positive = z.coerce.number().min(0).max(100_000_000);
const coef = z.coerce.number().min(0.1).max(5);

export const pricingSchema = z.object({
  packages: z.object({
    warm: z.object({ label: z.string(), pricePerM2: positive, description: z.string() }),
    prefinish: z.object({ label: z.string(), pricePerM2: positive, description: z.string() }),
    turnkey: z.object({ label: z.string(), pricePerM2: positive, description: z.string() }),
  }),
  materials: z.object({
    aerated: z.object({ label: z.string(), coefficient: coef }),
    brick: z.object({ label: z.string(), coefficient: coef }),
    timber: z.object({ label: z.string(), coefficient: coef }),
    frame: z.object({ label: z.string(), coefficient: coef }),
    monolith: z.object({ label: z.string(), coefficient: coef }),
    other: z.object({ label: z.string(), coefficient: coef }),
  }),
  floors: z.object({ "1": coef, "2": coef, "3": coef }),
  extras: z.object({
    designPerM2: positive,
    architecturePerM2: positive,
    engineeringPerM2: positive,
    landscapeProject: positive,
    lawnPerM2: positive,
    trees: z.object({
      small: z.object({ label: z.string(), price: positive }),
      medium: z.object({ label: z.string(), price: positive }),
      large: z.object({ label: z.string(), price: positive }),
    }),
    shrubPrice: positive,
    lightingPoint: positive,
    terracePerM2: positive,
    gazeboFrom: positive,
  }),
  roundTo: positive,
}) satisfies z.ZodType<PricingConfig>;

async function readSetting<T>(key: string, schema: z.ZodType<T>, fallback: T): Promise<T> {
  try {
    const row = await db.setting.findUnique({ where: { key } });
    if (!row) return fallback;
    const parsed = schema.safeParse(row.value);
    return parsed.success ? parsed.data : fallback;
  } catch (err) {
    console.error(`[settings] failed to read "${key}"`, err);
    return fallback;
  }
}

export const getContacts = cache(() => readSetting<Contacts>("contacts", contactsSchema, DEFAULT_CONTACTS));
export const getPricing = cache(() => readSetting<PricingConfig>("pricing", pricingSchema, DEFAULT_PRICING));

export async function saveSetting(key: "contacts" | "pricing", value: Contacts | PricingConfig) {
  await db.setting.upsert({
    where: { key },
    create: { key, value: value as object },
    update: { value: value as object },
  });
}
