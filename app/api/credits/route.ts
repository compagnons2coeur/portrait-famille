import { NextRequest, NextResponse } from "next/server";
import { canGenerate, getCreditsUsage } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const fingerprint = request.nextUrl.searchParams.get("fingerprint");

    if (!fingerprint) {
      return NextResponse.json(
        { error: "fingerprint est requis." },
        { status: 400 }
      );
    }

    const { used, remaining } = await getCreditsUsage(fingerprint);
    const access = await canGenerate(fingerprint);

    return NextResponse.json({
      used,
      remaining,
      needsEmail: access.needsEmail,
    });
  } catch (error) {
    console.error("[GET /api/credits]", error);
    return NextResponse.json(
      { error: "Impossible de lire les crédits." },
      { status: 500 }
    );
  }
}
