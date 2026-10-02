/**
 * Builds tiny blurred previews for every image in public/images, so a photo area is never
 * an empty box while the full image loads.  npm run images:blur
 * Output: src/content/blur-placeholders.json  { "/images/...webp": "data:image/webp;base64,..." }
 */
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("public");
const out = path.resolve("src/content/blur-placeholders.json");
const result = {};

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (/\.(webp|jpe?g|png)$/i.test(entry.name)) {
      result["/" + path.relative(root, full).split(path.sep).join("/")] = full;
    }
  }
}
walk(path.join(root, "images"));

const map = {};
for (const [url, file] of Object.entries(result).sort()) {
  const buf = await sharp(file).resize(16, 12, { fit: "cover" }).webp({ quality: 45 }).toBuffer();
  map[url] = `data:image/webp;base64,${buf.toString("base64")}`;
}
fs.writeFileSync(out, JSON.stringify(map, null, 0) + "\n");
console.log(`blur placeholders: ${Object.keys(map).length} → ${path.relative(process.cwd(), out)} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
