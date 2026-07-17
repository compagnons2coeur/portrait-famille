// Rend le fond blanc d'une aquarelle transparent (mode "wash" du tunnel),
// en préservant les lavis colorés. Reproduit à l'identique la fonction
// `unmatteWhite` de app/api/transparent/route.ts — PAS de BiRefNet.
//
// Usage :
//   node scripts/wash-transparent.mjs entree.png sortie.png [chromaBoost=0.4]
//
// Le résultat est un PNG à fond transparent, prêt à être donné à Seedream
// (ou à composer sur un t-shirt) sans rectangle blanc.

import sharp from "sharp";

const [, , inPath, outPath, chromaArg] = process.argv;
if (!inPath || !outPath) {
  console.error("Usage : node scripts/wash-transparent.mjs entree.png sortie.png [chromaBoost=0.4]");
  process.exit(1);
}
const chromaBoost = chromaArg ? parseFloat(chromaArg) : 0.4; // 0.4 = valeur du tunnel pour le wash

const { data, info } = await sharp(inPath)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const px = info.width * info.height;
const out = Buffer.alloc(px * 4);

for (let i = 0; i < px; i++) {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  const a0 = data[i * 4 + 3];

  const darkness = 255 - Math.min(r, g, b);
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  const aw = Math.min(255, darkness + Math.round(chroma * chromaBoost));
  const a = Math.round((a0 * aw) / 255);
  if (a === 0) continue;

  const um = Math.max(1, darkness); // un-matte depuis le blanc
  out[i * 4]     = Math.min(255, Math.round((r - (255 - um)) * 255 / um));
  out[i * 4 + 1] = Math.min(255, Math.round((g - (255 - um)) * 255 / um));
  out[i * 4 + 2] = Math.min(255, Math.round((b - (255 - um)) * 255 / um));
  out[i * 4 + 3] = a;
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(outPath);

console.log(`OK → ${outPath} (${info.width}×${info.height}, chromaBoost ${chromaBoost})`);
