import { put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_WIDTH = 2000;

export async function POST(request: NextRequest) {
  try {
    const { dataUrl } = await request.json() as { dataUrl: string };

    if (!dataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Image invalide." }, { status: 400 });
    }

    const base64 = dataUrl.split(",")[1];
    const inputBuffer = Buffer.from(base64, "base64");

    const compressed = await sharp(inputBuffer)
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();

    const filename = `portraits/watermarked-${Date.now()}.jpg`;

    const blob = await put(filename, compressed, {
      access: "public",
      contentType: "image/jpeg",
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[POST /api/upload-watermark]", error);
    return NextResponse.json({ error: "Erreur upload." }, { status: 500 });
  }
}
