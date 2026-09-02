import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ALLOWED_ORIGINS = new Set([
  "https://compagnonsdecoeur.fr",
  "https://www.compagnonsdecoeur.fr",
  "https://portrait-famille.compagnonsdecoeur.fr",
]);

export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const allowed = Boolean(origin && ALLOWED_ORIGINS.has(origin));
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: allowed ? 204 : 403 });
    if (allowed && origin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
      response.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      response.headers.set("Access-Control-Allow-Headers", "Content-Type");
      response.headers.set("Vary", "Origin");
    }
    return response;
  }
  if (origin && !allowed) return NextResponse.json({ error: "Origine non autorisée." }, { status: 403 });
  const response = NextResponse.next();
  if (allowed && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export const config = { matcher: "/api/:path*" };
