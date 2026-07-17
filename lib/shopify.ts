/**
 * Accès à l'API Admin de Shopify.
 *
 * Le token Admin est obtenu via le flux OAuth `client_credentials` (Dev
 * Dashboard) : il est TEMPORAIRE (expire ~quelques heures). On ne peut donc
 * pas le stocker en dur dans une variable d'env — on le régénère à la volée
 * à partir de SHOPIFY_CLIENT_ID + SHOPIFY_CLIENT_SECRET, avec un cache mémoire
 * qui le réutilise jusqu'à son expiration.
 *
 * Variables d'env requises (Vercel + .env.local) :
 *   - SHOPIFY_SHOP_DOMAIN   (ex. 1fpt7m-xx.myshopify.com)
 *   - SHOPIFY_CLIENT_ID
 *   - SHOPIFY_CLIENT_SECRET (le shpss_… — secret, jamais côté client)
 */

const SHOP = process.env.SHOPIFY_SHOP_DOMAIN!;
const CLIENT_ID = process.env.SHOPIFY_CLIENT_ID!;
const CLIENT_SECRET = process.env.SHOPIFY_CLIENT_SECRET!;

// Cache mémoire (persiste tant que l'instance serverless reste chaude).
let cached: { token: string; expiresAt: number } | null = null;

/** Marge de sécurité : on renouvelle 2 min avant l'expiration annoncée. */
const REFRESH_MARGIN_MS = 120_000;

/**
 * Retourne un token Admin valide. Réutilise le token en cache s'il n'est pas
 * proche de l'expiration, sinon en génère un nouveau via client_credentials.
 */
export async function getShopifyAdminToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cached && cached.expiresAt > now + REFRESH_MARGIN_MS) {
    return cached.token;
  }

  const res = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Shopify token (${res.status}): ${detail.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error("Shopify token : réponse sans access_token");
  }

  const ttlMs = (data.expires_in ?? 3600) * 1000;
  cached = { token: data.access_token, expiresAt: now + ttlMs };
  return data.access_token;
}

/** Invalide le token en cache (à appeler sur une 401 pour forcer un refresh). */
export function clearShopifyTokenCache(): void {
  cached = null;
}

/**
 * Appelle l'API Admin Shopify avec un token frais, et retente UNE fois avec un
 * token régénéré si Shopify répond 401 (token expiré entre-temps).
 */
export async function shopifyAdminFetch(
  path: string,
  init: Omit<RequestInit, "headers"> & { headers?: Record<string, string> } = {},
): Promise<Response> {
  const doFetch = async (token: string) =>
    fetch(`https://${SHOP}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
        "X-Shopify-Access-Token": token,
      },
    });

  let res = await doFetch(await getShopifyAdminToken());
  if (res.status === 401) {
    // Token invalide/expiré → on force un nouveau token et on retente une fois.
    res = await doFetch(await getShopifyAdminToken(true));
  }
  return res;
}
