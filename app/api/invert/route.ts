import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * « Encre blanche » : inverse la luminance d'un design à trait (croquis, line art)
 * SANS toucher l'alpha — traits noirs → blancs, gris graphite → gris clairs.
 * Programmatique et déterministe : c'est pixel pour pixel le portrait validé
 * par le client, juste recoloré (aucune régénération IA).
 * Entrée : le PNG transparent produit par /api/transparent (mode "ink").
 * Retourne l'URL d'un PNG hébergé sur Vercel Blob.
 */
export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json() as { imageUrl: string };
    if (!imageUrl) {
      return NextResponse.json({ error: "Paramètre imageUrl manquant." }, { status: 400 });
    }

    const res = await fetch(imageUrl);
    if (!res.ok) throw new Error("Image source inaccessible.");
    const input = Buffer.from(await res.arrayBuffer());

    // negate({ alpha: false }) : inversion RVB uniquement, l'alpha du détourage
    // est préservé — le design reste détouré, seuls les traits changent de couleur.
    const inverted = await sharp(input)
      .ensureAlpha()
      .negate({ alpha: false })
      .png()
      .toBuffer();

    const blob = await put(`portraits/white-ink-${Date.now()}.png`, inverted, {
      access: "public",
      contentType: "image/png",
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[POST /api/invert]", error);
    const msg = error instanceof Error ? error.message : "erreur inconnue";
    return NextResponse.json({ error: `Erreur encre blanche : ${msg}` }, { status: 500 });
  }
}
