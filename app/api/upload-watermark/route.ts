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

    // PNG conservé (transparence des styles détourés), JPEG sinon.
    const isPng = dataUrl.startsWith("data:image/png");
    const pipeline = sharp(inputBuffer).resize({ width: MAX_WIDTH, withoutEnlargement: true });
    const compressed = isPng
      ? await pipeline.png().toBuffer()
      : await pipeline.jpeg({ quality: 85 }).toBuffer();

    const filename = `portraits/watermarked-${Date.now()}.${isPng ? "png" : "jpg"}`;

    const blob = await put(filename, compressed, {
      access: "public",
      contentType: isPng ? "image/png" : "image/jpeg",
    });

    return NextResponse.json({ url: blob.url });
  } catch (error) {
    console.error("[POST /api/upload-watermark]", error);
    return NextResponse.json({ error: "Erreur upload." }, { status: 500 });
  }
}
