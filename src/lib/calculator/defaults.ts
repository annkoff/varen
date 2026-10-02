import type { CalculatorInput, PricingConfig } from "./types";

export const DEFAULT_PRICING: PricingConfig = {
  packages: {
    warm: {
      label: "Тёплый контур",
      pricePerM2: 65_000,
      description: "Фундамент, стены, перекрытия, кровля, окна и входная дверь. Дом закрыт и готов к зиме.",
    },
    prefinish: {
      label: "Предчистовая",
      pricePerM2: 85_000,
      description: "Тёплый контур плюс разводка инженерии, стяжка, штукатурка. Остаётся чистовая отделка.",
    },
    turnkey: {
      label: "Под ключ",
      pricePerM2: 110_000,
      description: "Дом полностью готов к жизни: отделка, сантехника, свет, двери, кухня по проекту.",
    },
  },
  materials: {
    aerated: { label: "Газобетон", coefficient: 1 },
    brick: { label: "Кирпич", coefficient: 1.12 },
    timber: { label: "Клееный брус", coefficient: 1.15 },
    frame: { label: "Каркас", coefficient: 0.9 },
    monolith: { label: "Монолит", coefficient: 1.1 },
    other: { label: "Другой материал", coefficient: 1 },
  },
  // One-storey houses need more foundation and roof per m², three storeys add stairs and slabs.
  floors: { "1": 1.05, "2": 1, "3": 1.04 },
  extras: {
    designPerM2: 3_000,
    architecturePerM2: 1_500,
    engineeringPerM2: 6_500,
    landscapeProject: 150_000,
    lawnPerM2: 800,
    trees: {
      small: { label: "Саженцы до 1,5 м", price: 4_500 },
      medium: { label: "Деревья 2–3 м", price: 12_000 },
      large: { label: "Крупномеры от 4 м", price: 35_000 },
    },
    shrubPrice: 1_200,
    lightingPoint: 9_000,
    terracePerM2: 18_000,
    gazeboFrom: 450_000,
  },
  roundTo: 10_000,
};

export const AREA_PRESETS = [80, 100, 120, 150, 180, 200] as const;

export const DEFAULT_INPUT: CalculatorInput = {
  area: 150,
  floors: 2,
  material: "aerated",
  package: "turnkey",
  extras: {
    design: false,
    architecture: false,
    engineering: false,
    landscape: false,
    lawn: { enabled: false, area: 300 },
    greenery: { enabled: false, trees: 10, treeSize: "medium", shrubs: 20 },
    lighting: { enabled: false, points: 12 },
    terrace: { enabled: false, area: 30 },
    gazebo: false,
    other: { enabled: false, note: "" },
  },
};

export const CALC_LIMITS = {
  area: { min: 30, max: 2000 },
  lawn: { min: 10, max: 20_000 },
  trees: { min: 0, max: 500 },
  shrubs: { min: 0, max: 2000 },
  lighting: { min: 1, max: 300 },
  terrace: { min: 5, max: 500 },
} as const;
