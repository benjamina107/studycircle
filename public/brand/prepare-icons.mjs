// Run from any directory: node public/brand/prepare-icons.mjs
// Only resizes and pads the original artwork. Never crops or redraws it.
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { fileURLToPath } from "node:url";

const original = new URL("./favicon-source.png", import.meta.url);
const app = new URL("../../src/app/", import.meta.url);

async function paddedIcon(size) {
  const inset = Math.round(size * 0.08);
  const inner = size - inset * 2;
  return sharp(fileURLToPath(original))
    .resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .extend({ top: inset, bottom: inset, left: inset, right: inset, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .ensureAlpha()
    .png()
    .toBuffer();
}

await writeFile(new URL("icon.png", app), await paddedIcon(512));
await writeFile(new URL("apple-icon.png", app), await paddedIcon(180));

// Standard ICO directory containing PNG frames for common browser sizes.
const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(paddedIcon));
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
frames.forEach((frame, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(frame.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += frame.length;
});
await writeFile(new URL("favicon.ico", app), Buffer.concat([directory, ...frames]));
