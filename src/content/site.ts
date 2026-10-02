export const SITE_NAME = "VAREN";
export const FOUNDED_YEAR = 2005;

export const NAV_LINKS = [
  { href: "/projects", label: "Проекты" },
  { href: "/services", label: "Услуги" },
  { href: "/about", label: "О компании" },
  { href: "/prices", label: "Стоимость" },
  { href: "/reviews", label: "Отзывы" },
  { href: "/contacts", label: "Контакты" },
] as const;

export interface Contacts {
  phone: string;
  phoneHref: string;
  email: string;
  address: string;
  hours: string;
  hoursNote: string;
}

/** Defaults; the live values are editable in Admin → Settings. */
export const DEFAULT_CONTACTS: Contacts = {
  phone: "+7 926 111 11 111",
  phoneHref: "+792611111111",
  email: "info@gmail.com",
  address: "Москва, ул. Волхонка, 15",
  hours: "Пн–Пт 9:00–20:00, Сб 10:00–17:00",
  hoursNote: "Воскресенье — выходной. Заявки с сайта принимаем круглосуточно.",
};

export const MATERIALS = [
  "Газобетон",
  "Кирпич",
  "Клееный брус",
  "Оцилиндрованное бревно",
  "Каркас",
  "Монолит",
] as const;

export const IMAGE_CATEGORY_LABELS = {
  EXTERIOR: "Экстерьер",
  INTERIOR: "Интерьер",
  FINISHING: "Отделка",
  PLOT: "Участок",
  LANDSCAPE: "Ландшафт",
  EXTRA: "Доп. объекты",
} as const;

export type ImageCategoryKey = keyof typeof IMAGE_CATEGORY_LABELS;

export const PACKAGE_LABELS: Record<string, string> = {
  warm: "Тёплый контур",
  prefinish: "Предчистовая",
  turnkey: "Под ключ",
};

export const REGIONS = [
  "Москва",
  "Московская область",
  "Санкт-Петербург",
  "Ленинградская область",
  "Тверская область",
  "Калужская область",
  "Владимирская область",
  "Ярославская область",
  "Тульская область",
  "Краснодарский край",
  "Республика Крым",
  "Ростовская область",
  "Нижегородская область",
  "Республика Татарстан",
  "Свердловская область",
  "Новосибирская область",
  "Другой регион",
];
