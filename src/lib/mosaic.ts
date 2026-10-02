/**
 * Photo mosaic without empty cells: 2 columns on phones, 3 from md.
 * The first photo is large; the last one stretches to fill whatever is left in its row,
 * so any number of photos (and any gallery filter) produces a complete rectangle.
 */
export function mosaicClasses(index: number, count: number): string {
  const rest = count - 1;
  if (index === 0) {
    const md = rest >= 2 ? "md:col-span-2 md:row-span-2 md:aspect-auto" : rest === 1 ? "md:col-span-2 md:aspect-[8/3]" : "md:col-span-3 md:aspect-[16/7]";
    return `col-span-2 aspect-[16/10] ${md}`;
  }
  const isLast = index === count - 1;
  const mobile = isLast && rest % 2 === 1 ? "col-span-2 aspect-[8/3]" : "aspect-[4/3]";
  let md = "md:col-span-1 md:aspect-[4/3]";
  if (isLast && rest >= 2) {
    const r = (rest - 2) % 3;
    if (r === 1) md = "md:col-span-3 md:aspect-[4/1]";
    if (r === 2) md = "md:col-span-2 md:aspect-[8/3]";
  }
  return `${mobile} ${md}`;
}

export function mosaicSizes(index: number): string {
  return index === 0 ? "(min-width: 768px) 66vw, 100vw" : "(min-width: 768px) 33vw, 50vw";
}
