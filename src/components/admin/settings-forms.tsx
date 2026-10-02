"use client";

import { useActionState } from "react";
import type { Contacts } from "@/content/site";
import type { PricingConfig } from "@/lib/calculator";
import { changePassword, deleteDemoData, saveContacts, savePricing, telegramTest, type SettingsState } from "@/app/admin/(panel)/settings/actions";

function Result({ state }: { state: SettingsState }) {
  if (!state) return null;
  return state.error ? <p className="text-sm text-err" role="alert">{state.error}</p> : <p className="text-sm text-ok" role="status">{state.ok}</p>;
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block truncate text-xs text-mute" title={label}>{label}</span>
      <input className="field-box min-w-0" {...props} />
    </label>
  );
}

export function ContactsForm({ contacts }: { contacts: Contacts }) {
  const [state, action, pending] = useActionState(saveContacts, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Телефон (как показывать)" name="phone" defaultValue={contacts.phone} required />
        <Input label="Телефон для ссылки tel: (только цифры, можно +)" name="phoneHref" defaultValue={contacts.phoneHref} required />
        <Input label="Email" name="email" type="email" defaultValue={contacts.email} required />
        <Input label="Адрес (по нему строится карта)" name="address" defaultValue={contacts.address} required />
        <Input label="Часы работы" name="hours" defaultValue={contacts.hours} />
        <Input label="Примечание к часам" name="hoursNote" defaultValue={contacts.hoursNote} />
      </div>
      <Result state={state} />
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить контакты"}
      </button>
    </form>
  );
}

export function PricingForm({ pricing }: { pricing: PricingConfig }) {
  const [state, action, pending] = useActionState(savePricing, undefined);
  const num = (path: string, label: string, value: number, step = "1") => <Input key={path} label={label} name={`p:${path}`} defaultValue={value} type="number" step={step} min={0} required />;
  return (
    <form action={action} className="space-y-6">
      <fieldset>
        <legend className="mb-3 text-sm">Комплектации, ₽/м²</legend>
        <div className="grid gap-4 sm:grid-cols-3">
          {(["warm", "prefinish", "turnkey"] as const).map((k) => num(`packages.${k}.pricePerM2`, pricing.packages[k].label, pricing.packages[k].pricePerM2))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm">Коэффициенты материала</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(Object.keys(pricing.materials) as Array<keyof PricingConfig["materials"]>).map((k) => num(`materials.${k}.coefficient`, pricing.materials[k].label, pricing.materials[k].coefficient, "0.01"))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm">Коэффициенты этажности</legend>
        <div className="grid grid-cols-3 gap-4">
          {(["1", "2", "3"] as const).map((k) => num(`floors.${k}`, `${k} эт.`, pricing.floors[k], "0.01"))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-sm">Дополнительные работы, ₽</legend>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {num("extras.designPerM2", "Дизайн, за м²", pricing.extras.designPerM2)}
          {num("extras.architecturePerM2", "Архитектура, за м²", pricing.extras.architecturePerM2)}
          {num("extras.engineeringPerM2", "Инженерия, за м²", pricing.extras.engineeringPerM2)}
          {num("extras.landscapeProject", "Ландшафтный проект", pricing.extras.landscapeProject)}
          {num("extras.lawnPerM2", "Газон, за м²", pricing.extras.lawnPerM2)}
          {num("extras.trees.small.price", pricing.extras.trees.small.label, pricing.extras.trees.small.price)}
          {num("extras.trees.medium.price", pricing.extras.trees.medium.label, pricing.extras.trees.medium.price)}
          {num("extras.trees.large.price", pricing.extras.trees.large.label, pricing.extras.trees.large.price)}
          {num("extras.shrubPrice", "Кустарник, шт.", pricing.extras.shrubPrice)}
          {num("extras.lightingPoint", "Светильник, шт.", pricing.extras.lightingPoint)}
          {num("extras.terracePerM2", "Терраса, за м²", pricing.extras.terracePerM2)}
          {num("extras.gazeboFrom", "Беседка, от", pricing.extras.gazeboFrom)}
          {num("roundTo", "Округление итога до", pricing.roundTo)}
        </div>
      </fieldset>
      <Result state={state} />
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Сохраняем…" : "Сохранить цены"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <Input label="Текущий пароль" name="current" type="password" autoComplete="current-password" required />
      <Input label="Новый пароль (от 10 символов)" name="next" type="password" autoComplete="new-password" minLength={10} required />
      <Input label="Повторите новый пароль" name="repeat" type="password" autoComplete="new-password" minLength={10} required />
      <Result state={state} />
      <button className="btn btn-primary btn-sm" disabled={pending}>
        {pending ? "Сохраняем…" : "Изменить пароль"}
      </button>
    </form>
  );
}

export function TelegramTestForm() {
  const [state, action, pending] = useActionState(telegramTest, undefined);
  return (
    <form action={action} className="space-y-3">
      <button className="btn btn-outline btn-sm" disabled={pending}>
        {pending ? "Отправляем…" : "Отправить тестовое сообщение"}
      </button>
      <Result state={state} />
    </form>
  );
}

export function DemoCleanupForm() {
  const [state, action, pending] = useActionState(deleteDemoData, undefined);
  return (
    <form action={action} className="space-y-3">
      <Input label="Введите DELETE, чтобы удалить все демо-заявки и демо-аналитику" name="confirm" placeholder="DELETE" autoComplete="off" />
      <button className="btn btn-outline btn-sm border-err/50 text-err" disabled={pending}>
        {pending ? "Удаляем…" : "Удалить демо-данные"}
      </button>
      <Result state={state} />
    </form>
  );
}
