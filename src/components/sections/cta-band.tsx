import Image from "next/image";
import { blurProps } from "@/lib/images";
import { ButtonLink } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";

export function CtaBand({
  title = "Расскажите, какой дом вы хотите",
  text = "Ответим в течение рабочего дня, предложим время встречи и подготовим первые цифры.",
  image = "/images/photos/ph-15.webp",
}: {
  title?: string;
  text?: string;
  image?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden">
      <Image src={image} {...blurProps(image)} alt="" fill sizes="100vw" quality={85} className="-z-10 object-cover" />
      <div className="absolute inset-0 -z-10 bg-ink/70" />
      <div className="container-x py-28 md:py-40">
        <Reveal className="max-w-3xl">
          <h2 className="h-section">{title}</h2>
          <p className="lead-text mt-6 max-w-xl">{text}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/request" cta="cta_band_request">
              Оставить заявку
            </ButtonLink>
            <ButtonLink href="/prices#calculator" variant="outline" cta="cta_band_calculator">
              Рассчитать стоимость
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
