// Generate raster PNG app icons from the brand SVGs using sharp.
//
// Usage:
//   node scripts/generate-icons.mjs
//
// Integrator: add this to package.json "scripts":
//   "gen:icons": "node scripts/generate-icons.mjs"
//
// Renders the SVGs at a high density so they rasterize crisply at the
// target size, then resizes and writes PNGs into public/icons.

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");
const iconsDir = resolve(projectRoot, "public", "icons");

const jobs = [
  { from: "icon.svg", to: "icon-192.png", size: 192 },
  { from: "icon.svg", to: "icon-512.png", size: 512 },
  { from: "maskable.svg", to: "maskable-512.png", size: 512 },
  { from: "apple-touch-icon.svg", to: "apple-touch-icon.png", size: 180 },
];

for (const { from, to, size } of jobs) {
  const srcPath = resolve(iconsDir, from);
  const outPath = resolve(iconsDir, to);
  const svgBuffer = await readFile(srcPath);
  await sharp(svgBuffer, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Wrote ${outPath} (${size}x${size}) from ${from}`);
}
