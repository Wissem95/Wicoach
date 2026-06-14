// Generates the Wicoach app icons (gradient "W" monogram) with sharp.
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const grad = `
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16c47f"/>
      <stop offset="1" stop-color="#0d9488"/>
    </linearGradient>
    <linearGradient id="sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.18"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
  </defs>`;

const wMark = (sw = 50) => `
  <path d="M128 148 L206 372 L256 256 L306 372 L384 148"
        fill="none" stroke="#ffffff" stroke-width="${sw}"
        stroke-linejoin="round" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="0"/>`;

// Rounded icon (for browsers / any purpose)
const rounded = (rx) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${grad}
  <rect width="512" height="512" rx="${rx}" fill="url(#g)"/>
  <rect width="512" height="512" rx="${rx}" fill="url(#sheen)"/>
  ${wMark(52)}
</svg>`;

// Maskable: full-bleed bg, mark kept inside the safe zone (smaller).
const maskable = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${grad}
  <rect width="512" height="512" fill="url(#g)"/>
  <g transform="translate(256 256) scale(0.74) translate(-256 -256)">${wMark(56)}</g>
</svg>`;

mkdirSync("public", { recursive: true });

const jobs = [
  { svg: rounded(112), size: 512, out: "public/icon-512.png" },
  { svg: rounded(112), size: 192, out: "public/icon-192.png" },
  { svg: rounded(40), size: 180, out: "public/apple-touch-icon.png" },
  { svg: maskable, size: 512, out: "public/icon-maskable-512.png" },
  { svg: rounded(96), size: 32, out: "public/favicon.png" },
];

for (const j of jobs) {
  await sharp(Buffer.from(j.svg)).resize(j.size, j.size).png().toFile(j.out);
  console.log("wrote", j.out);
}
