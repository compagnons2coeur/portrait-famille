import { NextRequest, NextResponse } from "next/server";
import { getRedis } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 jours

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, mockupUuid, smartObjectUuid, transparent } = await request.json() as {
      imageUrl: string;
      mockupUuid: string;
      smartObjectUuid: string;
      transparent?: boolean; // mode overlay : rendu PNG à fond transparent
    };

    if (!imageUrl || !mockupUuid || !smartObjectUuid) {
      return NextResponse.json({ error: "Paramètres manquants." }, { status: 400 });
    }

    if (!process.env.DYNAMIC_MOCKUPS_API_KEY) {
      return NextResponse.json({ error: "Clé API Dynamic Mockups manquante." }, { status: 500 });
    }

    // Les images du site (ex. photos démo "/demos/x.jpg") sont relatives :
    // Dynamic Mockups doit recevoir une URL absolue pour pouvoir les télécharger.
    const absoluteImageUrl = imageUrl.startsWith("/")
      ? new URL(imageUrl, request.url).toString()
      : imageUrl;

    // Cache Redis : chaque rendu coûte 1 crédit Dynamic Mockups. Les combinaisons
    // fixes (photos démo notamment) ne sont ainsi générées qu'une seule fois.
    const cacheKey = `mockup:${mockupUuid}:${transparent ? "png:" : ""}${absoluteImageUrl}`;
    const redis = getRedis();
    try {
      const cached = await redis.get<string>(cacheKey);
      if (cached) {
        return NextResponse.json({ mockupUrl: cached, cached: true });
      }
    } catch { /* cache indisponible → on génère */ }

    const res = await fetch("https://app.dynamicmockups.com/api/v1/renders", {
      method: "POST",
      headers: {
        "x-api-key": process.env.DYNAMIC_MOCKUPS_API_KEY,
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mockup_uuid: mockupUuid,
        smart_objects: [
          {
            uuid: smartObjectUuid,
            asset: { url: absoluteImageUrl },
          },
        ],
        // PNG requis en mode overlay pour conserver la transparence du fond.
        ...(transparent ? { image_format: "png", export_options: { image_format: "png" } } : {}),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("[POST /api/mockup]", res.status, data);
      const detail = typeof data?.message === "string" ? data.message : JSON.stringify(data ?? {});
      return NextResponse.json(
        { error: `Erreur Dynamic Mockups : ${detail.slice(0, 300)}` },
        { status: 500 },
      );
    }

    const mockupUrl = data.data?.export_path ?? data.export_path ?? data.url;
    if (!mockupUrl) {
      console.error("[POST /api/mockup] réponse sans URL:", data);
      return NextResponse.json(
        { error: `Erreur Dynamic Mockups : réponse sans image (${JSON.stringify(data ?? {}).slice(0, 200)})` },
        { status: 500 },
      );
    }

    try {
      await redis.set(cacheKey, mockupUrl, { ex: CACHE_TTL_SECONDS });
    } catch { /* cache indisponible → tant pis */ }

    return NextResponse.json({ mockupUrl });
  } catch (error) {
    console.error("[POST /api/mockup]", error);
    return NextResponse.json({ error: "Erreur serveur." }, { status: 500 });
  }
}
