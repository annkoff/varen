// Dev helper: cut a tall screenshot into readable pieces.  node scripts/crop.mjs <png> <pieceHeight>
import sharp from "sharp";
const [file, h = "1800"] = process.argv.slice(2);
const meta = await sharp(file).metadata();
const ph = Number(h);
for (let i = 0, top = 0; top < meta.height; i++, top += ph) {
  const height = Math.min(ph, meta.height - top);
  await sharp(file).extract({ left: 0, top, width: meta.width, height }).resize({ width: Math.min(meta.width, 1000) }).jpeg({ quality: 75 }).toFile(file.replace(/\.png$/, `_p${i}.jpg`));
}
console.log(Math.ceil(meta.height / ph), "pieces");
