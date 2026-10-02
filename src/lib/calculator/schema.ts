import { z } from "zod";
import { CALC_LIMITS } from "./defaults";
import type { CalculatorInput } from "./types";

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export const calculatorInputSchema = z.object({
  area: int(CALC_LIMITS.area.min, CALC_LIMITS.area.max),
  floors: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  material: z.enum(["aerated", "brick", "timber", "frame", "monolith", "other"]),
  package: z.enum(["warm", "prefinish", "turnkey"]),
  extras: z.object({
    design: z.boolean(),
    architecture: z.boolean(),
    engineering: z.boolean(),
    landscape: z.boolean(),
    lawn: z.object({ enabled: z.boolean(), area: int(CALC_LIMITS.lawn.min, CALC_LIMITS.lawn.max) }),
    greenery: z.object({
      enabled: z.boolean(),
      trees: int(CALC_LIMITS.trees.min, CALC_LIMITS.trees.max),
      treeSize: z.enum(["small", "medium", "large"]),
      shrubs: int(CALC_LIMITS.shrubs.min, CALC_LIMITS.shrubs.max),
    }),
    lighting: z.object({ enabled: z.boolean(), points: int(CALC_LIMITS.lighting.min, CALC_LIMITS.lighting.max) }),
    terrace: z.object({ enabled: z.boolean(), area: int(CALC_LIMITS.terrace.min, CALC_LIMITS.terrace.max) }),
    gazebo: z.boolean(),
    other: z.object({ enabled: z.boolean(), note: z.string().trim().max(300) }),
  }),
}) satisfies z.ZodType<CalculatorInput>;

export function parseCalculatorInput(value: unknown): CalculatorInput | null {
  const r = calculatorInputSchema.safeParse(value);
  return r.success ? (r.data as CalculatorInput) : null;
}
