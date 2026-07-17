import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { fal } from "@/lib/fal";
// Tuile de filigrane pré-rendue (public/watermark-tile.png) : le texte est déjà
// rasterisé, car les serveurs Vercel n'ont pas de polices pour du SVG <text>.
let tileCache: Buffer | null = null;
async function getWatermarkTile(requestUrl: string): Promise<Buffer | null> {
  if (tileCache) return tileCache;
  try {
    const res = await fetch(new URL("/watermark-tile.png", requestUrl));
    if (!res.ok) return null;
    tileCache = Buffer.from(await res.arrayBuffer());
    return tileCache;
  } catch {
    return null;
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Modèles FAL de suppression de fond, essayés dans l'ordre. */
const CUTOUT_MODELS = ["fal-ai/birefnet/v2", "fal-ai/birefnet", "fal-ai/imageutils/rembg"];

/** Détourage IA du sujet (FAL). Retourne le PNG détouré, ou null si tous les modèles échouent. */
async function birefnetCutout(imageUrl: string): Promise<Buffer | null> {
  for (const model of CUTOUT_MODELS) {
    try {
      const result = await fal.subscribe(model, {
        input: { image_url: imageUrl },
      }) as { data?: { image?: { url?: string } } };
      const url = result.data?.image?.url;
      if (!url) {
        console.error(`[transparent] ${model} : réponse sans image`, result.data);
        continue;
      }
      const res = await fetch(url);
      if (!res.ok) {
        console.error(`[transparent] ${model} : résultat inaccessible (${res.status})`);
        continue;
      }
      console.log(`[transparent] détourage OK via ${model}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (error) {
      console.error(`[transparent] ${model} a échoué :`, error);
    }
  }
  return null;
}

/**
 * « Suppression du blanc » avec préservation des couleurs (un-matte from white),
 * combinée à l'alpha existant. Blanc → transparent, trait noir → noir,
 * lavis coloré → sa teinte avec l'opacité correspondante.
 */
async function unmatteWhite(input: Buffer, chromaBoost = 0): Promise<Buffer> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const px = info.width * info.height;
  const out = Buffer.alloc(px * 4);
  for (let i = 0; i < px; i++) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const a0 = data[i * 4 + 3]; // alpha existant (ex. issu du détourage)
    // Opacité selon la « noirceur »… plus, en mode wash, un bonus selon la
    // saturation : les lavis colorés PÂLES (sage, pêche) survivent au lieu
    // d'être assimilés au blanc et effacés. Le blanc pur (chroma 0) reste
    // transparent.
    const darkness = 255 - Math.min(r, g, b);
    const chroma = Math.max(r, g, b) - Math.min(r, g, b);
    const aw = Math.min(255, darkness + Math.round(chroma * chromaBoost));
    const a = Math.round((a0 * aw) / 255);
    if (a === 0) continue;
    // Un-matte depuis le blanc : on récupère la couleur d'origine du lavis.
    // Le facteur reste basé sur la « noirceur » (darkness) pour ne pas
    // sur-éclaircir les tâches dont l'alpha a été gonflé par la chroma.
    const um = Math.max(1, darkness);
    out[i * 4]     = Math.min(255, Math.round((r - (255 - um)) * 255 / um));
    out[i * 4 + 1] = Math.min(255, Math.round((g - (255 - um)) * 255 / um));
    out[i * 4 + 2] = Math.min(255, Math.round((b - (255 - um)) * 255 / um));
    out[i * 4 + 3] = a;
  }
  return sharp(out, {
    raw: { width: info.width, height: info.height, channels: 4 },
  }).png().toBuffer();
}

/**
 * Rend le fond d'un portrait transparent.
 * - mode "ink"    : traits nets (croquis, line art) → détourage IA (retire les
 *                   restes de photo) PUIS suppression du blanc (garde les traits).
 * - mode "wash"   : aquarelle → suppression du blanc SEULE, sans détourage :
 *                   garde les tâches de couleur et les bords doux (+ bonus chroma).
 * - mode "cutout" : photos (studio) → détourage IA seul (les blancs du sujet sont gardés).
 * Retourne l'URL d'un PNG hébergé sur Vercel Blob.
 */
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, mode } = await request.json() as {
      imageUrl: string;
      mode: "ink" | "cutout" | "wash";
    };

    if (!imageUrl || !mode) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    let pngBuffer: Buffer;

    if (mode === "wash") {
      // Aquarelle : PAS de détourage IA (il segmenterait le sujet et
      // effacerait les tâches de couleur autour, en grignotant les bords).
      // On garde toute la composition et on rend seulement le blanc
      // transparent, avec un bonus de chroma pour préserver les lavis pâles.
      const res = await fetch(imageUrl);
      if (!res.ok) throw new Error("Image source inaccessible.");
      const base = Buffer.from(await res.arrayBuffer());
      // Boost chroma volontairement doux : la suppression du blanc reconstruit
      // déjà fidèlement les tâches sur un vêtement clair. Un léger bonus aide
      // juste à les garder lisibles sur les coloris moyens/foncés.
      pngBuffer = await unmatteWhite(base, 0.4);
    } else if (mode === "ink") {
      // 1) Détourage IA — supprime les restes du décor photo que le modèle
      //    de génération laisse parfois malgré la consigne de fond blanc.
      const cut = await birefnetCutout(imageUrl);

      // 2) Suppression du blanc sur le résultat (ou sur l'original si le
      //    détourage a échoué) — les traits/lavis gardent densité et couleur.
      let base: Buffer;
      if (cut) {
        base = cut;
      } else {
        const res = await fetch(imageUrl);
        if (!res.ok) throw new Error("Image source inaccessible.");
        base = Buffer.from(await res.arrayBuffer());
      }
      pngBuffer = await unmatteWhite(base);
    } else {
      const cut = await birefnetCutout(imageUrl);
      if (!cut) throw new Error("Détourage IA échoué.");
      pngBuffer = cut;
    }

    // Version filigranée générée ici (le PNG est trop lourd pour un
    // aller-retour client → /api/upload-watermark plafonné à 4,5 Mo).
    const meta = await sharp(pngBuffer).metadata();
    const width = meta.width ?? 1024;
    let watermarked = pngBuffer;
    const tile = await getWatermarkTile(request.url);
    if (tile) {
      const scaledTile = await sharp(tile)
        .resize({ width: Math.max(220, Math.round(width / 3)) })
        .png()
        .toBuffer();
      watermarked = await sharp(pngBuffer)
        .composite([{ input: scaledTile, tile: true }])
        .png()
        .toBuffer();
    } else {
      console.error("[transparent] tuile de filigrane introuvable — aperçu livré sans filigrane");
    }

    const stamp = Date.now();
    const [blob, wmBlob] = await Promise.all([
      put(`portraits/transparent-${stamp}.png`, pngBuffer, {
        access: "public",
        contentType: "image/png",
      }),
      put(`portraits/transparent-wm-${stamp}.png`, watermarked, {
        access: "public",
        contentType: "image/png",
      }),
    ]);

    return NextResponse.json({ url: blob.url, watermarkedUrl: wmBlob.url });
  } catch (error) {
    console.error("[POST /api/transparent]", error);
    const msg = error instanceof Error ? error.message : "erreur inconnue";
    return NextResponse.json({ error: `Erreur de détourage : ${msg}` }, { status: 500 });
  }
}
