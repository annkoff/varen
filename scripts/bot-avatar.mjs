/**
 * Renders the Telegram bot avatar (VAREN wordmark, brand colors) → public/brand/bot-avatar.png
 *   node scripts/bot-avatar.mjs
 * Telegram crops avatars to a circle, so the mark sits in the safe center area.
 */
import sharp from "sharp";
import fs from "node:fs";

const S = 1024;
// Same strokes as src/components/brand/logo.tsx (viewBox -1 -1 114 26), scaled to fit the circle.
const scale = 5.6;
const w = 114 * scale;
const x = (S - w) / 2;
const y = S / 2 - 13 * scale - 30;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="g" cx="50%" cy="38%" r="70%">
      <stop offset="0%" stop-color="#1d1c19"/>
      <stop offset="100%" stop-color="#0c0c0b"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#g)"/>
  <g transform="translate(${x} ${y}) scale(${scale}) translate(1 1)" fill="none" stroke="#ede9e1" stroke-width="1.6" stroke-linecap="square" stroke-linejoin="miter">
    <path d="M0 0 L9 24 L18 0"/>
    <path d="M24 24 L33 0 L42 24"/>
    <path d="M50 24 V0 H57.5 A6.5 6.5 0 0 1 57.5 13 H50 M56.5 13 L64.5 24"/>
    <path d="M86 0 H72 V24 H86 M72 12 H83"/>
    <path d="M94 24 V0 L111 24 V0"/>
  </g>
  <line x1="${S / 2 - 150}" y1="${y + 26 * scale + 70}" x2="${S / 2 + 150}" y2="${y + 26 * scale + 70}" stroke="#c8a97e" stroke-width="6"/>
  <text x="${S / 2}" y="${y + 26 * scale + 140}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="40" letter-spacing="14" fill="#9a958b">С 2005 ГОДА</text>
</svg>`;

fs.mkdirSync("public/brand", { recursive: true });
await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile("public/brand/bot-avatar.png");
await sharp(Buffer.from(svg)).jpeg({ quality: 95 }).toFile("public/brand/bot-avatar.jpg");
console.log("public/brand/bot-avatar.png, .jpg (1024×1024)");
