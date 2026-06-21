"use client";

import { useEffect, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantData {
  variantId: number; // 0 = Shopify ID not configured yet
  price: number;
  mockupUuid?: string;
  smartObjectUuid?: string;
}

interface ProductConfig {
  label: string;
  description: string;
  primaryLabel?: string;      // "Format", "Taille", "Modèle", "Capacité"
  primaryOptions: string[];   // empty = produit unique (mug, badge…)
  secondaryLabel?: string;    // "Couleur"
  secondaryOptions?: string[];
  colorMap?: Record<string, string>; // color name → hex swatch
  variants: Record<string, VariantData>; // key = primary or "primary-secondary"
  showCadre?: boolean;
  showSignature?: boolean;
  showDigital?: boolean;
  defaultPrimaryIdx?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SMART_OBJ_METAL = "1685ddb5-152d-4595-8624-4213d767037e";
const MOCKUP_METAL    = "6486ae2b-f0f8-436d-9290-22f03fc1543d";
const MOCKUP_TOILE    = "d695bb0a-f01e-4a74-9127-c18240bc6a54";
const SMART_TOILE     = "ecf80a3c-8ab3-4fcd-878a-ce6b8b8e112e";

const SIZES_VETEMENTS = ["S", "M", "L", "XL"];
const COLORS_BASE = ["Blanc", "Noir"];
const COLOR_MAP: Record<string, string> = {
  "Blanc": "#f5f5f0", "Noir": "#1a1a1a", "Marron": "#7a4a2e",
  "Bleu ciel": "#87CEEB", "Vert": "#4CAF50", "Rouge": "#E53935", "Gris": "#9E9E9E",
};

// ─── Variant builders ─────────────────────────────────────────────────────────

function sizeColorMap(sizes: string[], colors: string[], price: number): Record<string, VariantData> {
  const map: Record<string, VariantData> = {};
  for (const s of sizes) for (const c of colors) map[`${s}-${c}`] = { variantId: 0, price };
  return map;
}

function singleMap(options: string[], price: number | number[]): Record<string, VariantData> {
  return Object.fromEntries(
    options.map((o, i) => [o, { variantId: 0, price: Array.isArray(price) ? price[i] : price }])
  );
}

function variantKey(primary: string, secondary?: string): string {
  if (!primary || primary === "default") return "default";
  return secondary ? `${primary}-${secondary}` : primary;
}

// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCTS: Record<string, ProductConfig> = {
  "tableau-toile": {
    label: "Tableau Toile",
    description: "Portrait imprimé sur toile tendue premium, prêt à accrocher.",
    primaryLabel: "Format", primaryOptions: ["20×30 cm", "30×40 cm", "40×60 cm", "50×70 cm"],
    variants: {
      "20×30 cm": { variantId: 53838496661847, price: 34.90, mockupUuid: MOCKUP_TOILE, smartObjectUuid: SMART_TOILE },
      "30×40 cm": { variantId: 53838496694615, price: 44.90, mockupUuid: MOCKUP_TOILE, smartObjectUuid: SMART_TOILE },
      "40×60 cm": { variantId: 53838496727383, price: 59.90, mockupUuid: MOCKUP_TOILE, smartObjectUuid: SMART_TOILE },
      "50×70 cm": { variantId: 53838496760151, price: 74.90, mockupUuid: MOCKUP_TOILE, smartObjectUuid: SMART_TOILE },
    },
    showCadre: true, showSignature: true, showDigital: true, defaultPrimaryIdx: 1,
  },
  "tableau-metal": {
    label: "Tableau Métal",
    description: "Portrait sublimé sur plaque aluminium, rendu brillant et couleurs éclatantes.",
    primaryLabel: "Format", primaryOptions: ["20×30 cm", "30×40 cm", "40×60 cm", "50×70 cm"],
    variants: {
      "20×30 cm": { variantId: 53838536147287, price: 39.90, mockupUuid: MOCKUP_METAL, smartObjectUuid: SMART_OBJ_METAL },
      "30×40 cm": { variantId: 53838536180055, price: 49.90, mockupUuid: MOCKUP_METAL, smartObjectUuid: SMART_OBJ_METAL },
      "40×60 cm": { variantId: 53838536212823, price: 64.90, mockupUuid: MOCKUP_METAL, smartObjectUuid: SMART_OBJ_METAL },
      "50×70 cm": { variantId: 53838536245591, price: 79.90, mockupUuid: MOCKUP_METAL, smartObjectUuid: SMART_OBJ_METAL },
    },
    showCadre: true, showSignature: true, showDigital: true, defaultPrimaryIdx: 1,
  },
  "tshirt": {
    label: "T-shirt",
    description: "T-shirt personnalisé, impression DTF haute définition.",
    primaryLabel: "Taille", primaryOptions: SIZES_VETEMENTS,
    secondaryLabel: "Couleur", secondaryOptions: COLORS_BASE, colorMap: COLOR_MAP,
    variants: sizeColorMap(SIZES_VETEMENTS, COLORS_BASE, 24.90),
    defaultPrimaryIdx: 1,
  },
  "sweat": {
    label: "Sweat",
    description: "Sweat molletonné personnalisé, impression DTF.",
    primaryLabel: "Taille", primaryOptions: SIZES_VETEMENTS,
    secondaryLabel: "Couleur", secondaryOptions: COLORS_BASE, colorMap: COLOR_MAP,
    variants: sizeColorMap(SIZES_VETEMENTS, COLORS_BASE, 34.90),
    defaultPrimaryIdx: 1,
  },
  "polo": {
    label: "Polo",
    description: "Polo personnalisé avec votre portrait, coupe classique.",
    primaryLabel: "Taille", primaryOptions: SIZES_VETEMENTS,
    secondaryLabel: "Couleur", secondaryOptions: COLORS_BASE, colorMap: COLOR_MAP,
    variants: sizeColorMap(SIZES_VETEMENTS, COLORS_BASE, 29.90),
    defaultPrimaryIdx: 1,
  },
  "tablier": {
    label: "Tablier",
    description: "Tablier de cuisine personnalisé avec votre portrait.",
    primaryLabel: "Couleur", primaryOptions: ["Noir", "Blanc", "Marron"], colorMap: COLOR_MAP,
    variants: singleMap(["Noir", "Blanc", "Marron"], 27.90),
  },
  "body-bebe": {
    label: "Body bébé",
    description: "Body bébé personnalisé, 100% coton doux.",
    primaryLabel: "Taille",
    primaryOptions: ["0-3 mois", "3-6 mois", "6-9 mois", "9-12 mois", "12-18 mois", "18-24 mois"],
    variants: singleMap(["0-3 mois", "3-6 mois", "6-9 mois", "9-12 mois", "12-18 mois", "18-24 mois"], 19.90),
  },
  "pyjama": {
    label: "Pyjamas",
    description: "Pyjama personnalisé, matière douce pour des nuits confortables.",
    primaryLabel: "Taille", primaryOptions: SIZES_VETEMENTS,
    secondaryLabel: "Couleur", secondaryOptions: COLORS_BASE, colorMap: COLOR_MAP,
    variants: sizeColorMap(SIZES_VETEMENTS, COLORS_BASE, 34.90),
    defaultPrimaryIdx: 1,
  },
  "tote-bag": {
    label: "Tote bag",
    description: "Tote bag en coton personnalisé, taille unique.",
    primaryOptions: [],
    variants: { "default": { variantId: 0, price: 18.90 } },
  },
  "coque": {
    label: "Coque téléphone",
    description: "Coque personnalisée avec votre portrait en haute définition.",
    primaryLabel: "Modèle",
    primaryOptions: [
      "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
      "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
      "iPhone 17", "iPhone 17 Plus", "iPhone 17 Pro", "iPhone 17 Pro Max",
    ],
    variants: singleMap([
      "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
      "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
      "iPhone 17", "iPhone 17 Plus", "iPhone 17 Pro", "iPhone 17 Pro Max",
    ], 22.90),
  },
  "medaillon": {
    label: "Médaillons / Colliers",
    description: "Médaillon personnalisé avec le portrait de votre animal, à porter en collier.",
    primaryLabel: "Forme", primaryOptions: ["Cœur", "Os", "Rond"],
    variants: singleMap(["Cœur", "Os", "Rond"], 14.90),
  },
  "mug": {
    label: "Mug",
    description: "Mug personnalisé, impression sublimation, 11oz.",
    primaryOptions: [],
    variants: { "default": { variantId: 0, price: 16.90 } },
  },
  "gourde": {
    label: "Gourde",
    description: "Gourde isotherme personnalisée avec votre portrait.",
    primaryLabel: "Capacité", primaryOptions: ["500 ml", "1 L"],
    variants: singleMap(["500 ml", "1 L"], [22.90, 27.90]),
  },
  "tapis-souris": {
    label: "Tapis de souris",
    description: "Tapis de souris personnalisé, surface antidérapante.",
    primaryLabel: "Taille",
    primaryOptions: ["Small (20×25 cm)", "Medium (30×35 cm)", "Large (40×45 cm)"],
    variants: singleMap(["Small (20×25 cm)", "Medium (30×35 cm)", "Large (40×45 cm)"], [16.90, 22.90, 28.90]),
  },
  "magnet": {
    label: "Magnet",
    description: "Magnet personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 0, price: 7.90 } },
  },
  "badge": {
    label: "Badge",
    description: "Badge personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 0, price: 4.90 } },
  },
};

// ─── Cadres ───────────────────────────────────────────────────────────────────

const CADRES = [
  { id: "sans-cadre",   label: "Sans cadre",  surcharge: 0,  color: null },
  { id: "noir",         label: "Noir",         surcharge: 20, color: "#1a1a1a" },
  { id: "naturel",      label: "Naturel",      surcharge: 20, color: "#c4a97d" },
  { id: "blanc",        label: "Blanc",        surcharge: 20, color: "#f0ede8" },
  { id: "marron",       label: "Marron",       surcharge: 20, color: "#7a4a2e" },
  { id: "dore-antique", label: "Doré antique", surcharge: 25, color: "#c9a84c" },
];

const DIGITAL_PRICE = 4.99;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  productId: string;
  mockupImageUrl: string;
  shopifyImageUrl: string;
  petName?: string;
  onBack: () => void;
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function fmt(price: number) {
  return price.toFixed(2).replace(".", ",") + "€";
}

function Toggle({ on }: { on: boolean }) {
  return (
    <div
      className="relative h-6 w-11 rounded-full transition-colors pointer-events-none"
      style={{ backgroundColor: on ? "var(--green)" : "var(--border)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: on ? "translateX(20px)" : "translateX(2px)" }}
      />
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SupportSelector({ productId, mockupImageUrl, shopifyImageUrl, petName, onBack }: Props) {
  const product = PRODUCTS[productId] ?? PRODUCTS["tableau-toile"];

  const initialPrimary = product.primaryOptions[product.defaultPrimaryIdx ?? 0] ?? "default";
  const initialSecondary = product.secondaryOptions?.[0];

  const [selectedPrimary, setSelectedPrimary] = useState(initialPrimary);
  const [selectedSecondary, setSelectedSecondary] = useState<string | undefined>(initialSecondary);
  const [selectedCadre, setSelectedCadre] = useState(CADRES[0]);
  const [withSignature, setWithSignature] = useState(false);
  const [withDigital, setWithDigital] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [mockupUrl, setMockupUrl] = useState<string | null>(null);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [mockupError, setMockupError] = useState<string | null>(null);

  const currentKey = variantKey(selectedPrimary, selectedSecondary);
  const currentVariant = product.variants[currentKey] ?? Object.values(product.variants)[0];
  const hasMockup = !!currentVariant?.mockupUuid;
  const isConfigured = (currentVariant?.variantId ?? 0) !== 0;
  const totalPrice = (currentVariant?.price ?? 0) + selectedCadre.surcharge + (withDigital ? DIGITAL_PRICE : 0);

  useEffect(() => {
    if (!hasMockup) { setMockupUrl(null); return; }
    const generate = async () => {
      setMockupLoading(true); setMockupError(null);
      try {
        const res = await fetch("/api/mockup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: mockupImageUrl,
            mockupUuid: currentVariant.mockupUuid,
            smartObjectUuid: currentVariant.smartObjectUuid,
          }),
        });
        const data = await res.json() as { mockupUrl?: string; error?: string };
        if (!res.ok || !data.mockupUrl) throw new Error(data.error ?? "Erreur mockup.");
        setMockupUrl(data.mockupUrl);
      } catch (err) {
        setMockupError(err instanceof Error ? err.message : "Erreur inconnue.");
      } finally {
        setMockupLoading(false);
      }
    };
    void generate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockupImageUrl, selectedPrimary, selectedSecondary]);

  const handleCommander = async () => {
    if (!isConfigured) return;
    setCheckoutLoading(true);
    try {
      const properties: { name: string; value: string }[] = [];
      if (product.showCadre && selectedCadre.id !== "sans-cadre") properties.push({ name: "Cadre", value: selectedCadre.label });
      if (product.showSignature && withSignature && petName) properties.push({ name: "Signature", value: petName });
      if (product.showDigital && withDigital) properties.push({ name: "Fichier digital 4K", value: "Oui" });
      if (selectedPrimary !== "default") properties.push({ name: product.primaryLabel ?? "Option", value: selectedPrimary });
      if (selectedSecondary) properties.push({ name: product.secondaryLabel ?? "Couleur", value: selectedSecondary });

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: currentVariant.variantId, quantity: 1, portraitUrl: shopifyImageUrl, properties }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? "Erreur commande.");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur inconnue.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const previewSrc = hasMockup ? (mockupUrl ?? shopifyImageUrl) : shopifyImageUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="lg:flex lg:min-h-screen">

        {/* Left — preview */}
        <div className="lg:sticky lg:top-0 lg:h-screen lg:w-1/2 shrink-0 flex items-center justify-center relative" style={{ backgroundColor: "#e8e4de" }}>
          {hasMockup && mockupLoading && (
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-stone-500" />
          )}
          {hasMockup && mockupError && (
            <p className="px-8 text-center text-sm text-red-400">{mockupError}</p>
          )}
          {(!hasMockup || (!mockupLoading && !mockupError)) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt={`Aperçu ${product.label}`} className="w-full h-full object-cover" />
          )}
          <button
            type="button"
            onClick={onBack}
            className="absolute top-5 left-5 flex items-center gap-1.5 rounded-full bg-white/80 backdrop-blur-sm px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-white"
            style={{ color: "var(--ink)" }}
          >
            ← Retour
          </button>
        </div>

        {/* Right — options */}
        <div className="lg:w-1/2 px-6 py-10 lg:px-14 lg:py-14 space-y-8">

          <div>
            <h2 className="font-display text-3xl text-stone-900" style={{ letterSpacing: "-0.01em" }}>{product.label}</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{product.description}</p>
          </div>

          {/* Primary selector */}
          {product.primaryOptions.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {product.primaryLabel ?? "Option"}
              </p>
              {/* Chips for many options (coque iPhone), grid for few */}
              {product.primaryOptions.length > 6 ? (
                <div className="flex flex-wrap gap-2">
                  {product.primaryOptions.map(opt => {
                    const active = selectedPrimary === opt;
                    return (
                      <button key={opt} type="button" onClick={() => setSelectedPrimary(opt)}
                        className="rounded-full border px-4 py-1.5 text-sm transition-all"
                        style={{ borderColor: active ? "var(--ink)" : "var(--border)", backgroundColor: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink)" }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className={`grid gap-2 ${product.primaryOptions.length <= 4 ? "grid-cols-2" : "grid-cols-3"}`}>
                  {product.primaryOptions.map(opt => {
                    const active = selectedPrimary === opt;
                    const isPrimaryColor = !!product.colorMap?.[opt] && !product.secondaryOptions;
                    const varData = product.variants[variantKey(opt, selectedSecondary)];
                    return (
                      <button key={opt} type="button" onClick={() => setSelectedPrimary(opt)}
                        className="rounded-xl border py-3 px-4 text-center transition-all"
                        style={{ borderColor: active ? "var(--ink)" : "var(--border)", backgroundColor: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink)" }}>
                        {isPrimaryColor && product.colorMap?.[opt] && (
                          <span className="inline-block w-4 h-4 rounded-full mr-2 border align-middle"
                            style={{ backgroundColor: product.colorMap[opt], borderColor: active ? "rgba(255,255,255,0.4)" : "var(--border)" }} />
                        )}
                        <span className="text-sm font-semibold">{opt}</span>
                        {!product.secondaryOptions && varData && (
                          <span className="block text-xs opacity-60">{fmt(varData.price)}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Secondary / Color selector */}
          {product.secondaryOptions && product.secondaryOptions.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                {product.secondaryLabel ?? "Couleur"}
              </p>
              <div className="flex flex-wrap gap-2">
                {product.secondaryOptions.map(col => {
                  const active = selectedSecondary === col;
                  const hex = product.colorMap?.[col];
                  return (
                    <button key={col} type="button" onClick={() => setSelectedSecondary(col)}
                      className="flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-all"
                      style={{ borderColor: active ? "var(--ink)" : "var(--border)", backgroundColor: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink)" }}>
                      {hex && (
                        <span className="inline-block w-4 h-4 rounded-full border"
                          style={{ backgroundColor: hex, borderColor: active ? "rgba(255,255,255,0.4)" : "var(--border)" }} />
                      )}
                      {col}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{fmt(currentVariant?.price ?? 0)} TTC</p>
            </div>
          )}

          {/* Cadre */}
          {product.showCadre && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Cadre</p>
              <div className="grid grid-cols-3 gap-2">
                {CADRES.map(c => {
                  const active = selectedCadre.id === c.id;
                  return (
                    <button key={c.id} type="button" onClick={() => setSelectedCadre(c)}
                      className="flex flex-col items-center gap-1.5 rounded-xl border py-3 px-2 text-center transition-all"
                      style={{ borderColor: active ? "var(--ink)" : "var(--border)", backgroundColor: active ? "#faf9f7" : "white" }}>
                      {c.color ? (
                        <span className="h-5 w-5 rounded-full border shadow-sm" style={{ backgroundColor: c.color, borderColor: "var(--border)" }} />
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border border-dashed" style={{ borderColor: "var(--border)" }}>
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--border)" }} />
                        </span>
                      )}
                      <span className="text-xs font-medium text-stone-700 leading-tight">{c.label}</span>
                      <span className="text-[10px]" style={{ color: "var(--muted)" }}>
                        {c.surcharge === 0 ? "Inclus" : `+${fmt(c.surcharge)}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Options (signature / digital) */}
          {(product.showSignature || product.showDigital) && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Options</p>
              <div className="space-y-2">
                {product.showSignature && (
                  <div role="button" tabIndex={0}
                    onClick={() => setWithSignature(v => !v)}
                    onKeyDown={e => e.key === "Enter" && setWithSignature(v => !v)}
                    className="flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition hover:bg-stone-50"
                    style={{ borderColor: "var(--border)" }}>
                    <span className="text-xl">✍️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800">Signature</p>
                      <p className="text-xs truncate" style={{ color: "var(--muted)" }}>
                        {petName ? `Prénom « ${petName} » gravé sur le tableau` : "Ajoutez le prénom de votre compagnon"}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className="text-xs font-bold" style={{ color: "var(--green)" }}>Offert</span>
                      <Toggle on={withSignature} />
                    </div>
                  </div>
                )}
                {product.showDigital && (
                  <div role="button" tabIndex={0}
                    onClick={() => setWithDigital(v => !v)}
                    onKeyDown={e => e.key === "Enter" && setWithDigital(v => !v)}
                    className="flex cursor-pointer items-center gap-4 rounded-xl border p-4 transition hover:bg-stone-50"
                    style={{ borderColor: "var(--border)" }}>
                    <span className="text-xl">🖥️</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-stone-800">Fichier digital 4K</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>Recevez votre œuvre en haute définition</p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <span className="text-xs font-semibold text-stone-600">+{fmt(DIGITAL_PRICE)}</span>
                      <Toggle on={withDigital} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prix + CTA */}
          <div className="pt-2">
            <div className="mb-5 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-stone-900">{fmt(totalPrice)}</span>
              <span className="text-sm" style={{ color: "var(--muted)" }}>TTC · hors livraison</span>
            </div>
            {isConfigured ? (
              <button type="button" onClick={handleCommander} disabled={checkoutLoading}
                className="w-full rounded-full py-4 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: "var(--green)" }}>
                {checkoutLoading ? "Création de la commande…" : "Commander →"}
              </button>
            ) : (
              <div className="w-full rounded-full py-4 text-center text-sm font-semibold"
                style={{ backgroundColor: "var(--border)", color: "var(--muted)" }}>
                Commande en cours de configuration
              </div>
            )}
            <p className="mt-3 text-center text-xs" style={{ color: "var(--muted)" }}>
              Version HD sans filigrane livrée après commande confirmée.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
