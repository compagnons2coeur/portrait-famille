// Atelier Famille en préparation (lot 0, 30/09/2026) : page d'attente honnête, sans promesse ni création.
// Le tunnel historique (components/PortraitTunnel.tsx) n'est plus monté ; il sera remplacé par l'atelier commun.
const SHOP = "https://compagnonsdecoeur.fr";
const LINKS = [
  { href: `${SHOP}/products/t-shirt-personnalise-photo-animal`, label: "T-shirt personnalisé avec la photo de votre animal" },
  { href: `${SHOP}/products/sweat-capuche-personnalise-photo-animal`, label: "Sweat personnalisé avec la photo de votre animal" },
];

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#EDF0E4] via-[#FBF8F2] to-[#F5EFE6] px-4 py-12 sm:px-6">
      <section className="w-full max-w-xl rounded-3xl border border-[#EBE2D3] bg-white/80 p-8 text-center shadow-sm sm:p-10" style={{ fontFamily: "'Nunito Sans', system-ui, sans-serif", color: "#3B352E" }}>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#77875E]">Compagnons de Cœur · Portrait de famille</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight sm:text-5xl" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
          Bientôt disponible
        </h1>
        <p className="mt-5 text-base leading-relaxed text-[#5C544A]">
          Nous préparons un atelier dédié aux portraits de famille. Il n’est pas encore ouvert : aucune création ni commande n’est possible pour le moment.
        </p>
        <p className="mt-4 text-base leading-relaxed text-[#5C544A]">
          En attendant, nos textiles personnalisés avec la photo de votre animal sont disponibles sur la boutique.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className="rounded-full bg-[#AD5A41] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#9a4e38] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#AD5A41] focus-visible:ring-offset-2">
              {link.label}
            </a>
          ))}
          <a href={SHOP} className="mt-1 text-sm font-semibold text-[#77875E] underline underline-offset-4">Retour à la boutique</a>
        </div>
      </section>
    </main>
  );
}
