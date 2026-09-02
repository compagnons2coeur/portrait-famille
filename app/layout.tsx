import type { Metadata } from "next";
import "./globals.css";
import TikTokPixel from "@/components/TikTokPixel";

export const metadata: Metadata = {
  metadataBase: new URL("https://portrait-famille.compagnonsdecoeur.fr"),
  title: "Portrait personnalisé de famille | Aperçu gratuit",
  description:
    "Transformez une photo de famille en portrait personnalisé. Aperçu gratuit avant impression sur tableau ou textile.",
  alternates: { canonical: "/" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Nunito+Sans:wght@400;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen antialiased">
        <TikTokPixel />
        {children}
      </body>
    </html>
  );
}
