/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lot F (go de Julien du 03/10/2026) : le portrait de famille se commande désormais sur les fiches Shopify, réunies dans la collection.
  // Toute adresse de ce sous-domaine (pages, API) part en 301 vers la collection (décision de Julien) ; les paramètres (utm…) suivent.
  async redirects() {
    return [{ source: "/:path*", destination: "https://compagnonsdecoeur.fr/collections/famille", statusCode: 301 }];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.fal.media",
      },
      {
        protocol: "https",
        hostname: "fal.media",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "16mb",
    },
  },
};

export default nextConfig;
