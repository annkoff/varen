export type PackageId = "warm" | "prefinish" | "turnkey";
export type MaterialId = "aerated" | "brick" | "timber" | "frame" | "monolith" | "other";
export type TreeSize = "small" | "medium" | "large";

export type ExtraId =
  | "design"
  | "architecture"
  | "engineering"
  | "landscape"
  | "lawn"
  | "greenery"
  | "lighting"
  | "terrace"
  | "gazebo"
  | "other";

/** Prices are editable from the admin → Settings and stored in the DB. */
export interface PricingConfig {
  packages: Record<PackageId, { label: string; pricePerM2: number; description: string }>;
  materials: Record<MaterialId, { label: string; coefficient: number }>;
  floors: Record<"1" | "2" | "3", number>;
  extras: {
    designPerM2: number;
    architecturePerM2: number;
    engineeringPerM2: number;
    landscapeProject: number;
    lawnPerM2: number;
    trees: Record<TreeSize, { label: string; price: number }>;
    shrubPrice: number;
    lightingPoint: number;
    terracePerM2: number;
    gazeboFrom: number;
  };
  /** Final sum is rounded to this step (₽). */
  roundTo: number;
}

export interface CalculatorInput {
  area: number;
  floors: 1 | 2 | 3;
  material: MaterialId;
  package: PackageId;
  extras: {
    design: boolean;
    architecture: boolean;
    engineering: boolean;
    landscape: boolean;
    lawn: { enabled: boolean; area: number };
    greenery: { enabled: boolean; trees: number; treeSize: TreeSize; shrubs: number };
    lighting: { enabled: boolean; points: number };
    terrace: { enabled: boolean; area: number };
    gazebo: boolean;
    other: { enabled: boolean; note: string };
  };
}

export interface CalculatorLine {
  id: string;
  label: string;
  detail: string;
  amount: number;
}

export interface CalculatorResult {
  base: CalculatorLine;
  extras: CalculatorLine[];
  total: number;
  /** True when "other" works were selected — priced individually. */
  hasIndividual: boolean;
}
