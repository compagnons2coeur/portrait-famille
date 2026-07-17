"use client";

import { useEffect, useRef, useState } from "react";
import {
  APPAREL_COLORS,
  APPAREL_COLOR_MAP,
  buildBaseImageByColor,
  SWEAT_OVERLAY_MOCKUPS,
  SWEAT_VARIANTS,
  TSHIRT_OVERLAY_MOCKUPS,
  TSHIRT_VARIANTS,
} from "@/lib/apparel-config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VariantData {
  variantId: number; // 0 = Shopify ID not configured yet
  price: number;
  mockupUuid?: string;
  smartObjectUuid?: string;
}

interface MockupView {
  label: string; // "Avant", "Arrière"…
  mockupUuid: string;
  smartObjectUuid: string;
  /** Mode overlay : photo du vêtement (par couleur) affichée sous le design rendu. */
  baseImage?: string;
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
  defaultSecondaryIdx?: number;
  ficheIntro?: string;
  fiche?: { label: string; value: string }[];
  ficheBadges?: string[];
  // Emplacements d'impression activables par le client (sans surcoût),
  // avec choix de la position/taille du design pour chaque face.
  printSides?: {
    id: "avant" | "arriere";
    label: string;
    short: string;
    defaultOn: boolean;
    placements?: { id: string; label: string }[];
    defaultPlacementIdx?: number;
  }[];
  // ── Mode overlay (v2 multi-couleurs) ──
  // Le design est rendu UNE fois par face × emplacement (PSD « design seul »,
  // sans fond, exporté en PNG transparent) puis superposé sur la photo du
  // vêtement de la couleur choisie. Coût : 1 crédit par emplacement, quel que
  // soit le nombre de couleurs — et changement de couleur instantané.
  // ⚠️ Les photos par couleur doivent être alignées au pixel (recoloration
  // d'une photo maîtresse) et de même ratio que le canvas des PSD.
  overlayMockups?: {
    side: "avant" | "arriere";
    placement?: string;
    mockupUuid: string;
    smartObjectUuid: string;
  }[];
  // Photo du vêtement par couleur puis par face. Ex :
  // { "Off White": { avant: "/apparel/tshirt/off-white-avant.jpg", arriere: "…" } }
  baseImageByColor?: Record<string, Partial<Record<"avant" | "arriere", string>>>;
  // Mockups DynamicMockups : un par combinaison couleur × face × emplacement.
  mockups?: {
    color?: string;      // "Off White" | "Noir" — omis si le produit n'a pas de couleurs
    side: "avant" | "arriere";
    placement?: string;  // "petit-coeur" | "petit-centre" | "grand" — omis si pas de choix
    mockupUuid: string;
    smartObjectUuid: string;
  }[];
  /**
   * Aperçu « toile sur le mur » sans Dynamic Mockups : une scène frontale fixe,
   * le portrait est composé par-dessus aux dimensions RÉELLES du format choisi
   * (calibrage px/cm sur la scène). wPct/hPct = taille en % de l'image,
   * cxPct/cyPct = centre de la toile en % de l'image.
   */
  wallScene?: {
    image: string;
    aspectRatio: string; // ex "3/4" — ratio de l'image de scène
    formats: Record<string, { wPct: number; hPct: number; cxPct: number; cyPct: number }>;
  };
  sizeGuideImage?: string; // ex: "/guides/tshirt.png" — prioritaire sur le tableau
  sizeGuide?: {
    columns: string[]; // ex: ["XS", "S", "M", "L", "XL"]
    rows: { label: string; values: string[] }[];
    note?: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SMART_OBJ_METAL = "1685ddb5-152d-4595-8624-4213d767037e";
const MOCKUP_METAL    = "6486ae2b-f0f8-436d-9290-22f03fc1543d";
const MOCKUP_TOILE    = "d695bb0a-f01e-4a74-9127-c18240bc6a54";
const SMART_TOILE     = "ecf80a3c-8ab3-4fcd-878a-ce6b8b8e112e";

// ─── Variant builders ─────────────────────────────────────────────────────────

function variantKey(primary: string, secondary?: string): string {
  if (!primary || primary === "default") return "default";
  return secondary ? `${primary}-${secondary}` : primary;
}

// ─── Products ─────────────────────────────────────────────────────────────────

const PRODUCTS: Record<string, ProductConfig> = {
  "tableau-toile": {
    label: "Tableau Toile",
    description: "Portrait imprimé sur toile tendue main, livré avec son kit d'accrochage — prêt à poser.",
    // Formats réels Shopify (SKU CDC-TT-PERSO-*) — vérifiés via list-variants.mjs le 2026-07-06.
    // 40×50 retiré le 2026-07-17 (trop large pour la machine d'impression) — réactivable plus tard.
    primaryLabel: "Format", primaryOptions: ["20×20 cm", "24×30 cm", "30×40 cm"],
    variants: {
      // Prix figés le 2026-07-17 (Julien) : perso aligné sur le basique, pas d'écart — 20×20/24×30/30×40 = 19,90/24,90/34,90 €. Le tunnel lit aussi les prix Shopify en live.
      "20×20 cm": { variantId: 53838496661847, price: 19.90, mockupUuid: MOCKUP_TOILE, smartObjectUuid: SMART_TOILE },
      "24×30 cm": { variantId: 53838496694615, price: 24.90, mockupUuid: MOCKUP_TOILE, smartObjectUuid: SMART_TOILE },
      "30×40 cm": { variantId: 53838496727383, price: 34.90, mockupUuid: MOCKUP_TOILE, smartObjectUuid: SMART_TOILE },
    },
    // Aperçu composite : scène frontale + toile aux dimensions réelles.
    // Calibrage : image 1950×2600, plafond 250 cm → ~7,3 px/cm. Centre toile à ~150 cm du sol.
    wallScene: {
      image: "/decor/salon-toile.jpg",
      aspectRatio: "3/4",
      // Valeurs validées visuellement (montage v3 du 2026-07-08 — scène recadrée/zoomée 70 %).
      formats: {
        "20×20 cm": { wPct: 11.9, hPct: 8.9,  cxPct: 46, cyPct: 36 },
        "24×30 cm": { wPct: 14.1, hPct: 13.1, cxPct: 46, cyPct: 36 },
        "30×40 cm": { wPct: 17.6, hPct: 17.6, cxPct: 46, cyPct: 36 },
      },
    },
    // showCadre (caisse américaine +20-25 €) : réactiver quand l'atelier produira les cadres.
    showCadre: false, showSignature: true, showDigital: true, defaultPrimaryIdx: 2,
    ficheIntro: "Une vraie toile d'atelier : imprimée en haute définition, tendue main sur châssis en bois, agrafée au dos, angles pliés avec soin. Livrée avec son kit d'accrochage — elle se pose sur un simple clou ou s'installe sur une étagère.",
    fiche: [
      { label: "Finition",  value: "Portrait imprimé bord à bord, toile tendue main sur châssis bois, kit d'accrochage inclus" },
      { label: "Formats",   value: "20×20 (carré) · 24×30 · 30×40 cm" },
      { label: "Entretien", value: "Dépoussiérer au chiffon doux et sec. Éviter le plein soleil prolongé et les pièces humides" },
      { label: "Délai",     value: "Imprimée et tendue à la commande. Expédition sous 2 à 4 jours ouvrés, emballage renforcé" },
      { label: "Origine",   value: "Imprimée, tendue et contrôlée en France, dans notre atelier" },
    ],
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
    primaryLabel: "Couleur", primaryOptions: [...APPAREL_COLORS],
    secondaryLabel: "Taille", secondaryOptions: ["XS", "S", "M", "L", "XL"],
    colorMap: APPAREL_COLOR_MAP,
    variants: TSHIRT_VARIANTS,
    defaultPrimaryIdx: 0,
    defaultSecondaryIdx: 2,
    ficheIntro: "Le Creator 2.0 de Stanley/Stella, référence du textile responsable européen : un jersey 100 % coton biologique peigné, filé compact, à la surface lisse et au tombé impeccable. Le genre de t-shirt qu'on enfile et qu'on ne quitte plus — imprimé à la main, une pièce à la fois, dans notre atelier en France.",
    fiche: [
      { label: "Matière",    value: "100 % coton biologique peigné filé compact, 180 g/m²" },
      { label: "Finition",   value: "Votre portrait imprimé à l'avant (DTF haute tenue), col rond côtes 1x1, surpiqûre double aiguille au poignet et à l'ourlet" },
      { label: "Coupe",      value: "Unisexe medium fit. ½ poitrine : XS 47,5 · S 49,5 · M 53,5 · L 56,5 · XL 59,5 cm" },
      { label: "Entretien",  value: "Lavage 30°C sur l'envers · Repassage doux 110°C (jamais sur le motif) · Pas de sèche-linge ni blanchiment" },
      { label: "Délai",      value: "Imprimé à la commande avec soin. Expédition sous 2 à 4 jours ouvrés" },
      { label: "Origine",    value: "Textile Stanley/Stella. Portrait généré, imprimé et personnalisé en France, dans notre atelier" },
    ],
    ficheBadges: ["🌿 Coton bio GOTS", "🇫🇷 Imprimé en France", "🧵 Atelier artisanal", "OEKO-TEX®", "Fair Wear", "PETA Vegan"],
    printSides: [
      {
        id: "avant", label: "Design avant", short: "Avant", defaultOn: true,
        placements: [
          { id: "petit-coeur",  label: "Petit, côté cœur" },
          { id: "petit-centre", label: "Petit, centré" },
          { id: "grand",        label: "Grand" },
        ],
        defaultPlacementIdx: 0,
      },
      {
        id: "arriere", label: "Design arrière", short: "Arrière", defaultOn: true,
        placements: [
          { id: "grand",        label: "Grand" },
          { id: "petit-centre", label: "Petit, centré" },
        ],
        defaultPlacementIdx: 0,
      },
    ],
    overlayMockups: TSHIRT_OVERLAY_MOCKUPS,
    baseImageByColor: buildBaseImageByColor("tshirt"),
    sizeGuideImage: "/guides/tshirt.jpg",
    sizeGuide: {
      columns: ["XS", "S", "M", "L", "XL"],
      rows: [
        { label: "A — Demi-poitrine", values: ["47,5", "49,5", "53,5", "56,5", "59,5"] },
      ],
      note: "Mesures en cm, à plat. Entre deux tailles ? Prenez la taille au-dessus pour un tombé décontracté.",
    },
  },
  "sweat": {
    label: "Sweat à capuche",
    description: "Sweat à capuche premium personnalisé, molleton brossé 350 g/m².",
    primaryLabel: "Couleur", primaryOptions: [...APPAREL_COLORS],
    secondaryLabel: "Taille", secondaryOptions: ["XS", "S", "M", "L", "XL"],
    colorMap: APPAREL_COLOR_MAP,
    variants: SWEAT_VARIANTS,
    defaultPrimaryIdx: 0,
    defaultSecondaryIdx: 2,
    ficheIntro: "Le Cruiser 2.0 de Stanley/Stella : notre sweat à capuche premium en molleton brossé 350 g/m², 100 % coton biologique. Intérieur brossé tout doux, capuche doublée, cordons assortis à embouts métalliques — le sweat douillet par excellence, imprimé à la main dans notre atelier en France.",
    fiche: [
      { label: "Matière",   value: "Molleton brossé 100 % coton biologique filé et peigné, 350 g/m². (Coloris chinés : 80 % coton bio / 20 % coton recyclé)" },
      { label: "Finition",  value: "Votre portrait imprimé à l'avant (DTF haute tenue), capuche doublée, poche kangourou, cordons ronds à embouts métalliques, bord-côtes 1x1 aux poignets et à l'ourlet" },
      { label: "Coupe",     value: "Unisexe medium fit, manches montées. ½ poitrine : XS 53 · S 55 · M 59 · L 62 · XL 65 cm" },
      { label: "Entretien", value: "Lavage 30°C sur l'envers · Repassage doux 110°C (jamais sur le motif) · Pas de sèche-linge ni blanchiment" },
      { label: "Délai",     value: "Imprimé à la commande avec soin. Expédition sous 2 à 4 jours ouvrés" },
      { label: "Origine",   value: "Textile Stanley/Stella. Portrait généré, imprimé et personnalisé en France, dans notre atelier" },
    ],
    ficheBadges: ["🌿 Coton bio GOTS", "🇫🇷 Imprimé en France", "🧵 Atelier artisanal", "OEKO-TEX®", "Fair Wear", "PETA Vegan"],
    printSides: [
      {
        id: "avant", label: "Design avant", short: "Avant", defaultOn: true,
        placements: [
          { id: "petit-coeur", label: "Petit, côté cœur" },
          { id: "grand",       label: "Grand" },
        ],
        defaultPlacementIdx: 0,
      },
      { id: "arriere", label: "Design arrière (grand)", short: "Arrière", defaultOn: true },
    ],
    overlayMockups: SWEAT_OVERLAY_MOCKUPS,
    baseImageByColor: buildBaseImageByColor("sweat"),
    sizeGuideImage: "/guides/sweat.jpg",
    sizeGuide: {
      columns: ["XS", "S", "M", "L", "XL"],
      rows: [
        { label: "A — Demi-poitrine", values: ["53", "55", "59", "62", "65"] },
        { label: "B — Longueur corps", values: ["67", "71", "74", "76", "78"] },
        { label: "C — Longueur manche", values: ["60,5", "64,5", "66,5", "68,5", "69"] },
      ],
      note: "Mesures en cm, à plat. Entre deux tailles ? Prenez la taille au-dessus pour un tombé décontracté.",
    },
  },
  "polo": {
    label: "Polo",
    description: "Polo personnalisé avec votre portrait, coupe classique.",
    primaryLabel: "Taille", primaryOptions: ["XS", "S", "M", "L", "XL"],
    variants: {
      "XS": { variantId: 53843351404887, price: 29.90 },
      "S":  { variantId: 53843351437655, price: 29.90 },
      "M":  { variantId: 53843351470423, price: 29.90 },
      "L":  { variantId: 53843351503191, price: 29.90 },
      "XL": { variantId: 53843351535959, price: 29.90 },
    },
    defaultPrimaryIdx: 2,
  },
  "tablier": {
    label: "Tablier",
    description: "Tablier de cuisine personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936538890583, price: 27.90 } },
  },
  "body-bebe": {
    label: "Body bébé",
    description: "Body bébé personnalisé, 100% coton doux.",
    primaryLabel: "Taille",
    primaryOptions: ["0-3 mois", "3-6 mois", "6-9 mois", "9-12 mois", "12-18 mois", "18-24 mois"],
    variants: {
      "0-3 mois":   { variantId: 53843357892951, price: 19.90 },
      "3-6 mois":   { variantId: 53843357925719, price: 19.90 },
      "6-9 mois":   { variantId: 53843357958487, price: 19.90 },
      "9-12 mois":  { variantId: 53843357991255, price: 19.90 },
      "12-18 mois": { variantId: 53843358024023, price: 19.90 },
      "18-24 mois": { variantId: 53843358253399, price: 19.90 },
    },
  },
  "pyjama": {
    label: "Pyjamas",
    description: "Pyjama personnalisé, matière douce pour des nuits confortables.",
    primaryLabel: "Taille", primaryOptions: ["XS", "S", "M", "L", "XL"],
    variants: {
      "XS": { variantId: 53843358417239, price: 34.90 },
      "S":  { variantId: 53843358450007, price: 34.90 },
      "M":  { variantId: 53843358482775, price: 34.90 },
      "L":  { variantId: 53843358515543, price: 34.90 },
      "XL": { variantId: 53843358548311, price: 34.90 },
    },
    defaultPrimaryIdx: 2,
  },
  "tote-bag": {
    label: "Tote bag",
    description: "Tote bag en coton personnalisé, taille unique.",
    primaryOptions: [],
    variants: { "default": { variantId: 10935629676887, price: 18.90 } },
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
    variants: {
      "iPhone 15":          { variantId: 53838639104343, price: 22.90 },
      "iPhone 15 Plus":     { variantId: 53838639137111, price: 22.90 },
      "iPhone 15 Pro":      { variantId: 53838639169879, price: 22.90 },
      "iPhone 15 Pro Max":  { variantId: 53838639202647, price: 22.90 },
      "iPhone 16":          { variantId: 53838639235415, price: 22.90 },
      "iPhone 16 Plus":     { variantId: 53838643364183, price: 22.90 },
      "iPhone 16 Pro":      { variantId: 53838643396951, price: 22.90 },
      "iPhone 16 Pro Max":  { variantId: 53838643429719, price: 22.90 },
      "iPhone 17":          { variantId: 53838643462487, price: 22.90 },
      "iPhone 17 Plus":     { variantId: 53838643495255, price: 22.90 },
      "iPhone 17 Pro":      { variantId: 53838643528023, price: 22.90 },
      "iPhone 17 Pro Max":  { variantId: 53838643560791, price: 22.90 },
    },
  },
  "porte-cle": {
    label: "Porte-clé",
    description: "Porte-clé personnalisé avec le portrait de votre animal.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936540463447, price: 9.90 } },
  },
  "medaillon": {
    label: "Médaillon animal",
    description: "Médaillon personnalisé avec le portrait de votre animal, à accrocher sur le collier de votre pet.",
    primaryLabel: "Forme", primaryOptions: ["Cœur", "Os", "Rond"],
    variants: {
      "Cœur": { variantId: 53843359891799, price: 14.90 },
      "Os":   { variantId: 53843359924567, price: 14.90 },
      "Rond": { variantId: 53843359957335, price: 14.90 },
    },
  },
  "collier": {
    label: "Collier bijou",
    description: "Collier bijou personnalisé avec le portrait de votre animal, à porter au quotidien.",
    primaryLabel: "Forme", primaryOptions: ["Cœur", "Rond"],
    variants: {
      "Cœur": { variantId: 53843360055639, price: 19.90 },
      "Rond": { variantId: 53843360121175, price: 19.90 },
    },
  },
  "mug": {
    label: "Mug",
    description: "Mug personnalisé, impression sublimation, 11oz.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936553668951, price: 16.90 } },
  },
  "gourde": {
    label: "Gourde",
    description: "Gourde isotherme personnalisée avec votre portrait.",
    primaryLabel: "Capacité", primaryOptions: ["500 ml", "1 L"],
    variants: {
      "500 ml": { variantId: 53843558596951, price: 22.90 },
      "1 L":    { variantId: 53843558629719, price: 27.90 },
    },
  },
  "tapis-souris": {
    label: "Tapis de souris",
    description: "Tapis de souris personnalisé, surface antidérapante.",
    primaryLabel: "Taille",
    primaryOptions: ["Small (20×25 cm)", "Medium (30×35 cm)", "Large (40×45 cm)"],
    variants: {
      "Small (20×25 cm)":  { variantId: 53843584516439, price: 16.90 },
      "Medium (30×35 cm)": { variantId: 53843584549207, price: 22.90 },
      "Large (40×45 cm)":  { variantId: 53843584581975, price: 28.90 },
    },
  },
  "dessous-verre": {
    label: "Dessous de verre",
    description: "Dessous de verre personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554586455, price: 9.90 } },
  },
  "magnet": {
    label: "Magnet",
    description: "Magnet personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554619223, price: 7.90 } },
  },
  "stickers": {
    label: "Stickers",
    description: "Stickers personnalisés avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554651991, price: 0 } },
  },
  "planche-apero": {
    label: "Planche apéro",
    description: "Planche à découper personnalisée avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554717527, price: 29.90 } },
  },
  "decapsuleur": {
    label: "Décapsuleur",
    description: "Décapsuleur personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554815831, price: 12.90 } },
  },
  "marque-page": {
    label: "Marque-page bois",
    description: "Marque-page en bois gravé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554848599, price: 8.90 } },
  },
  "badge": {
    label: "Badge",
    description: "Badge personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554914135, price: 4.90 } },
  },
  "puzzle": {
    label: "Puzzle",
    description: "Puzzle personnalisé avec votre portrait.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936565170519, price: 0 } },
  },
  "gamelle": {
    label: "Gamelle animaux",
    description: "Gamelle personnalisée avec le portrait de votre animal.",
    primaryOptions: [],
    variants: { "default": { variantId: 10936554979671, price: 19.90 } },
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

export interface CartItemInput {
  productId: string;
  label: string;
  variantId: number;
  quantity: number;
  unitPrice: number;   // prix TTC affiché (variante + options)
  portraitUrl: string; // portrait HD pour la commande Shopify
  previewUrl: string;  // vignette affichée dans le panier
  properties: { name: string; value: string }[];
  extras: { title: string; price: number; requiresShipping?: boolean }[];
}

interface Props {
  productId: string;
  mockupImageUrl: string;
  shopifyImageUrl: string;
  petName?: string;
  /** Style à trait (croquis, line art) : design noir → encre blanche possible sur couleurs sombres. */
  inkInvertible?: boolean;
  onBack: () => void;
  onAddToCart: (item: CartItemInput) => void;
}

/** Couleurs textiles sombres sur lesquelles un design noir est illisible. */
const DARK_COLORS = ["Noir", "Rouge", "Bright Blue", "Glazed Green"];

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

export default function SupportSelector({ productId, mockupImageUrl, shopifyImageUrl, petName, inkInvertible, onBack, onAddToCart }: Props) {
  const product = PRODUCTS[productId] ?? PRODUCTS["tableau-toile"];

  const initialPrimary = product.primaryOptions[product.defaultPrimaryIdx ?? 0] ?? "default";
  const initialSecondary = product.secondaryOptions?.[product.defaultSecondaryIdx ?? 0];

  const [selectedPrimary, setSelectedPrimary] = useState(initialPrimary);
  const [selectedSecondary, setSelectedSecondary] = useState<string | undefined>(initialSecondary);
  const [selectedCadre, setSelectedCadre] = useState(CADRES[0]);
  const [withSignature, setWithSignature] = useState(false);
  const [withDigital, setWithDigital] = useState(false);
  const [sidesOn, setSidesOn] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((product.printSides ?? []).map(s => [s.id, s.defaultOn])),
  );
  const [placementBySide, setPlacementBySide] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      (product.printSides ?? [])
        .filter(s => s.placements?.length)
        .map(s => [s.id, s.placements![s.defaultPlacementIdx ?? 0].id]),
    ),
  );

  const setPlacement = (sideId: string, placementId: string) => {
    setPlacementBySide(prev => ({ ...prev, [sideId]: placementId }));
    setActiveView(0);
  };

  // Bascule un emplacement d'impression — au moins un doit rester actif.
  const toggleSide = (id: string) => {
    setSidesOn(prev => {
      const next = { ...prev, [id]: !prev[id] };
      if (!Object.values(next).some(Boolean)) return prev;
      return next;
    });
    setActiveView(0);
  };

  const [showSizeGuide, setShowSizeGuide] = useState(false);
  const [guideImgError, setGuideImgError] = useState(false);

  // ── Encre blanche (styles à trait × couleurs sombres) ──
  // Inversion programmatique du design (noir → blanc), même portrait pixel
  // pour pixel — jamais de régénération IA.
  const [whiteInk, setWhiteInk] = useState(false);
  const [invertedUrl, setInvertedUrl] = useState<string | null>(null);
  const [invertLoading, setInvertLoading] = useState(false);
  const whiteInkAvailable = !!inkInvertible
    && !!product.baseImageByColor // textiles en mode overlay (t-shirt, sweat…)
    && DARK_COLORS.includes(selectedPrimary);

  // Bascule automatique : couleur sombre choisie → encre blanche activée par
  // défaut (désactivable) ; retour sur couleur claire → design noir d'origine.
  useEffect(() => {
    setWhiteInk(!!inkInvertible && !!product.baseImageByColor && DARK_COLORS.includes(selectedPrimary));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPrimary, inkInvertible]);

  // Génère (une seule fois) la version encre blanche quand elle devient nécessaire.
  useEffect(() => {
    if (!whiteInk || invertedUrl || invertLoading) return;
    let cancelled = false;
    setInvertLoading(true);
    (async () => {
      try {
        const res = await fetch("/api/invert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: mockupImageUrl }),
        });
        const data = await res.json() as { url?: string; error?: string };
        if (!res.ok || !data.url) throw new Error(data.error ?? "Erreur encre blanche.");
        if (!cancelled) setInvertedUrl(data.url);
      } catch {
        // Échec silencieux : on retombe sur le design noir plutôt que de bloquer.
        if (!cancelled) setWhiteInk(false);
      } finally {
        if (!cancelled) setInvertLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whiteInk, invertedUrl, mockupImageUrl]);

  const effectiveDesignUrl = whiteInk && invertedUrl ? invertedUrl : mockupImageUrl;

  const [mockupUrls, setMockupUrls] = useState<Record<string, string>>({});
  const [activeView, setActiveView] = useState(0);
  const [mockupLoading, setMockupLoading] = useState(false);
  const [mockupError, setMockupError] = useState<string | null>(null);
  const [livePrices, setLivePrices] = useState<Record<number, number>>({});

  // Fetch live prices from Shopify (cached 1h server-side)
  useEffect(() => {
    const ids = Object.values(PRODUCTS)
      .flatMap(p => Object.values(p.variants))
      .map(v => v.variantId)
      .filter(id => id !== 0);
    if (!ids.length) return;
    fetch("/api/prices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then((data: Record<number, number>) => setLivePrices(data))
      .catch(() => { /* silently fallback to static prices */ });
  }, []);

  const livePrice = (variant: VariantData) =>
    livePrices[variant.variantId] ?? variant.price;

  const currentKey = variantKey(selectedPrimary, selectedSecondary);
  const currentVariant = product.variants[currentKey] ?? Object.values(product.variants)[0];
  const isConfigured = (currentVariant?.variantId ?? 0) !== 0;
  const totalPrice = livePrice(currentVariant) + selectedCadre.surcharge + (withDigital ? DIGITAL_PRICE : 0);

  // Vues mockup : mode wallScene (composite local, zéro API) prioritaire,
  // puis overlay (photo couleur + design superposé), puis mockups par couleur,
  // sinon mockup unique de la variante.
  const views: MockupView[] = product.wallScene
    ? []
    : product.overlayMockups?.length && product.baseImageByColor && product.printSides
    ? product.printSides
        .filter(s => sidesOn[s.id])
        .map((s): MockupView | null => {
          const placement = placementBySide[s.id];
          const def = product.overlayMockups!.find(m =>
            m.side === s.id && (!m.placement || !placement || m.placement === placement),
          );
          const base = product.baseImageByColor![selectedPrimary]?.[s.id];
          return def && base
            ? { label: s.short, mockupUuid: def.mockupUuid, smartObjectUuid: def.smartObjectUuid, baseImage: base }
            : null;
        })
        .filter((v): v is MockupView => v !== null)
    : product.mockups?.length && product.printSides
    ? product.printSides
        .filter(s => sidesOn[s.id])
        .map((s): MockupView | null => {
          const placement = placementBySide[s.id];
          const def = product.mockups!.find(m =>
            m.side === s.id
            && (!m.color || m.color === selectedPrimary)
            && (!m.placement || !placement || m.placement === placement),
          );
          return def ? { label: s.short, mockupUuid: def.mockupUuid, smartObjectUuid: def.smartObjectUuid } : null;
        })
        .filter((v): v is MockupView => v !== null)
    : (currentVariant?.mockupUuid && currentVariant?.smartObjectUuid
        ? [{ label: "Aperçu", mockupUuid: currentVariant.mockupUuid, smartObjectUuid: currentVariant.smartObjectUuid }]
        : []);
  const hasMockup = views.length > 0;

  // Cache des rendus : chaque rendu DynamicMockups coûte 1 crédit, donc
  // on ne génère QUE la vue affichée, et jamais deux fois la même combinaison.
  const mockupCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    const view = views[Math.min(activeView, Math.max(views.length - 1, 0))];
    if (!view) { setMockupError(null); setMockupLoading(false); return; }

    // L'encre blanche est en cours de préparation : on attend l'URL inversée
    // plutôt que de rendre (et payer) un mockup avec le design noir.
    if (whiteInk && !invertedUrl) { setMockupLoading(true); return; }

    const cacheKey = `${view.mockupUuid}:${effectiveDesignUrl}`;
    const cached = mockupCache.current.get(cacheKey);
    if (cached) {
      setMockupUrls(prev => (prev[view.label] === cached ? prev : { ...prev, [view.label]: cached }));
      setMockupError(null);
      setMockupLoading(false);
      return;
    }

    let cancelled = false;
    setMockupLoading(true);
    setMockupError(null);
    (async () => {
      try {
        const res = await fetch("/api/mockup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: effectiveDesignUrl,
            mockupUuid: view.mockupUuid,
            smartObjectUuid: view.smartObjectUuid,
            transparent: !!view.baseImage, // mode overlay : rendu PNG transparent
          }),
        });
        const data = await res.json() as { mockupUrl?: string; error?: string };
        if (!res.ok || !data.mockupUrl) throw new Error(data.error ?? "Erreur mockup.");
        mockupCache.current.set(cacheKey, data.mockupUrl);
        if (!cancelled) setMockupUrls(prev => ({ ...prev, [view.label]: data.mockupUrl! }));
      } catch (err) {
        if (!cancelled) setMockupError(err instanceof Error ? err.message : "Erreur inconnue.");
      } finally {
        if (!cancelled) setMockupLoading(false);
      }
    })();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDesignUrl, whiteInk, invertedUrl, selectedPrimary, productId, sidesOn, placementBySide, activeView]);

  const handleAddToCart = () => {
    if (!isConfigured) return;

    const properties: { name: string; value: string }[] = [];
    if (product.showCadre && selectedCadre.id !== "sans-cadre") properties.push({ name: "Cadre", value: selectedCadre.label });
    if (product.showSignature && withSignature && petName) properties.push({ name: "Signature", value: petName });
    if (product.showDigital && withDigital) properties.push({ name: "Fichier digital 4K", value: "Oui" });
    if (selectedPrimary !== "default") properties.push({ name: product.primaryLabel ?? "Option", value: selectedPrimary });
    if (selectedSecondary) properties.push({ name: product.secondaryLabel ?? "Couleur", value: selectedSecondary });
    // Production : signale l'encre blanche (le fichier joint est déjà inversé)
    if (whiteInk && invertedUrl) properties.push({ name: "Encre", value: "Blanche (design inversé pour couleur sombre)" });
    if (product.printSides) {
      const chosen = product.printSides.filter(s => sidesOn[s.id]).map(s => {
        const pl = s.placements?.find(p => p.id === placementBySide[s.id]);
        return pl ? `${s.short} (${pl.label})` : s.short;
      });
      properties.push({ name: "Impression", value: chosen.join(" + ") });
    }

    // Options payantes → facturées comme lignes dédiées de la commande
    const extras: CartItemInput["extras"] = [];
    if (product.showCadre && selectedCadre.surcharge > 0) {
      extras.push({ title: `Cadre ${selectedCadre.label}`, price: selectedCadre.surcharge, requiresShipping: true });
    }
    if (product.showDigital && withDigital) {
      extras.push({ title: "Fichier digital 4K", price: DIGITAL_PRICE, requiresShipping: false });
    }

    const labelDetail = selectedPrimary !== "default"
      ? `${product.label} — ${selectedPrimary}${selectedSecondary ? ` · ${selectedSecondary}` : ""}`
      : product.label;

    onAddToCart({
      productId,
      label: labelDetail,
      variantId: currentVariant.variantId,
      quantity: 1,
      unitPrice: totalPrice,
      // Encre blanche : le fichier de production est le PNG inversé (c'est lui
      // qu'il faut imprimer), pas le portrait noir d'origine.
      portraitUrl: whiteInk && invertedUrl ? invertedUrl : shopifyImageUrl,
      previewUrl: (hasMockup && views[0] && (mockupUrls[views[0].label] ?? views[0].baseImage)) || shopifyImageUrl,
      properties,
      extras,
    });
  };

  const safeViewIdx = Math.min(activeView, Math.max(views.length - 1, 0));
  const activeViewLabel = views[safeViewIdx]?.label;
  const activeBase = views[safeViewIdx]?.baseImage;
  const previewSrc = hasMockup
    ? ((activeViewLabel && mockupUrls[activeViewLabel]) || shopifyImageUrl)
    : shopifyImageUrl;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: "var(--bg)" }}>
      <div className="lg:flex lg:min-h-screen">

        {/* Left — preview */}
        <div className="lg:sticky lg:top-0 lg:h-screen lg:w-1/2 shrink-0 flex items-center justify-center relative" style={{ backgroundColor: "#e8e4de" }}>
          {product.wallScene ? (
            /* Composite local : scène frontale + toile aux dimensions réelles du format.
               Le wrapper garde le ratio exact de la scène pour que les % restent alignés. */
            <div className="relative" style={{ aspectRatio: product.wallScene.aspectRatio, height: "100%", maxWidth: "100%" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={product.wallScene.image} alt={`Aperçu ${product.label} dans un salon`} className="h-full w-full object-cover" />
              {(() => {
                const f = product.wallScene.formats[selectedPrimary];
                if (!f) return null;
                return (
                  <div
                    className="absolute transition-all duration-300"
                    style={{
                      left: `${f.cxPct - f.wPct / 2}%`,
                      top: `${f.cyPct - f.hPct / 2}%`,
                      width: `${f.wPct}%`,
                      height: `${f.hPct}%`,
                      boxShadow: "0 14px 34px rgba(42,42,42,.28), 0 3px 8px rgba(42,42,42,.16)",
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={shopifyImageUrl} alt={`Portrait de famille sur toile ${selectedPrimary}`} className="h-full w-full object-cover" />
                    {/* tranche de la toile : léger dégradé sur le bord droit/bas */}
                    <div className="pointer-events-none absolute inset-0" style={{ boxShadow: "inset -3px -3px 6px rgba(42,42,42,.18)" }} />
                  </div>
                );
              })()}
              <p className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/85 px-4 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm" style={{ color: "var(--ink)" }}>
                Taille réelle simulée — {selectedPrimary}
              </p>
            </div>
          ) : activeBase ? (
            /* Mode overlay : la photo couleur s'affiche immédiatement, le design se pose dessus */
            <div className="relative h-full w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={activeBase} alt={`Aperçu ${product.label}${activeViewLabel ? ` — ${activeViewLabel}` : ""}`} className="h-full w-full object-cover" />
              {activeViewLabel && mockupUrls[activeViewLabel] && !mockupError && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mockupUrls[activeViewLabel]} alt="" className="absolute inset-0 h-full w-full object-cover" />
              )}
              {mockupLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/60 border-t-stone-500" />
                </div>
              )}
              {mockupError && (
                <p className="absolute inset-x-0 bottom-24 px-8 text-center text-sm text-red-400">{mockupError}</p>
              )}
            </div>
          ) : (
            <>
              {hasMockup && mockupLoading && (
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-stone-200 border-t-stone-500" />
              )}
              {hasMockup && mockupError && (
                <p className="px-8 text-center text-sm text-red-400">{mockupError}</p>
              )}
              {(!hasMockup || (!mockupLoading && !mockupError)) && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewSrc} alt={`Aperçu ${product.label}${activeViewLabel ? ` — ${activeViewLabel}` : ""}`} className="w-full h-full object-cover" />
              )}
            </>
          )}
          {hasMockup && views.length > 1 && !mockupError && (
            <div className="absolute top-16 left-1/2 flex -translate-x-1/2 gap-2">
              {views.map((view, i) => (
                <button
                  key={view.label}
                  type="button"
                  onClick={() => setActiveView(i)}
                  className="rounded-full px-5 py-2 text-sm font-medium shadow-md backdrop-blur-sm transition"
                  style={
                    i === safeViewIdx
                      ? { backgroundColor: "var(--ink)", color: "white" }
                      : { backgroundColor: "rgba(255,255,255,0.85)", color: "var(--ink)" }
                  }
                >
                  {view.label}
                </button>
              ))}
            </div>
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
              {/* Pastilles couleur (textiles) ou chips (coque iPhone), grid pour peu d'options */}
              {product.colorMap && product.primaryLabel === "Couleur" ? (
                <>
                <div className="flex flex-wrap gap-2">
                  {product.primaryOptions.map(opt => {
                    const active = selectedPrimary === opt;
                    const hex = product.colorMap?.[opt];
                    return (
                      <button key={opt} type="button" onClick={() => setSelectedPrimary(opt)}
                        className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all"
                        style={{ borderColor: active ? "var(--ink)" : "var(--border)", backgroundColor: active ? "var(--ink)" : "white", color: active ? "white" : "var(--ink)" }}>
                        {hex && (
                          <span className="inline-block w-4 h-4 shrink-0 rounded-full border"
                            style={{ backgroundColor: hex, borderColor: active ? "rgba(255,255,255,0.4)" : "var(--border)" }} />
                        )}
                        {opt}
                      </button>
                    );
                  })}
                </div>

                {/* Encre blanche — styles à trait sur couleur sombre */}
                {whiteInkAvailable && (
                  <button
                    type="button"
                    onClick={() => setWhiteInk(v => !v)}
                    className="mt-3 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition"
                    style={{ borderColor: whiteInk ? "var(--green)" : "var(--border)", backgroundColor: whiteInk ? "#f4f8f4" : "white" }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-stone-800">🖌️ Encre blanche</p>
                      <p className="mt-0.5 text-xs" style={{ color: "var(--muted)" }}>
                        {invertLoading
                          ? "Préparation de l'aperçu…"
                          : "Recommandé sur les couleurs sombres — votre portrait, traits blancs. Gratuit."}
                      </p>
                    </div>
                    <Toggle on={whiteInk} />
                  </button>
                )}
                </>
              ) : product.primaryOptions.length > 6 ? (
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
                    const isPrimaryColor = !!product.colorMap?.[opt];
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
                          <span className="block text-xs opacity-60">{fmt(livePrice(varData))}</span>
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
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{fmt(livePrice(currentVariant))} TTC</p>
            </div>
          )}

          {/* Guide des tailles */}
          {(product.sizeGuideImage || product.sizeGuide) && (
            <button
              type="button"
              onClick={() => { setGuideImgError(false); setShowSizeGuide(true); }}
              className="-mt-4 text-sm underline underline-offset-4 transition hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              📏 Guide des tailles
            </button>
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

          {/* Options (impression / signature / digital) */}
          {(product.printSides || product.showSignature || product.showDigital) && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Options</p>
              <div className="space-y-2">
                {product.printSides?.map(side => (
                  <div key={side.id} className="rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSide(side.id)}
                      onKeyDown={e => e.key === "Enter" && toggleSide(side.id)}
                      className="flex cursor-pointer items-center gap-4 rounded-xl p-4 transition hover:bg-stone-50"
                    >
                      <span className="text-xl">{side.id === "avant" ? "👕" : "🎨"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-stone-800">{side.label}</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {side.placements?.length
                            ? "Sans surcoût — choisissez l'emplacement"
                            : "Sans surcoût — l'aperçu s'adapte à votre choix"}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <span className="text-xs font-bold" style={{ color: "var(--green)" }}>Inclus</span>
                        <Toggle on={!!sidesOn[side.id]} />
                      </div>
                    </div>
                    {!!sidesOn[side.id] && !!side.placements?.length && (
                      <div className="flex flex-wrap gap-2 px-4 pb-4">
                        {side.placements.map(p => {
                          const active = placementBySide[side.id] === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setPlacement(side.id, p.id)}
                              className="rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all"
                              style={
                                active
                                  ? { borderColor: "var(--ink)", backgroundColor: "var(--ink)", color: "white" }
                                  : { borderColor: "var(--border)", backgroundColor: "white", color: "var(--ink)" }
                              }
                            >
                              {p.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
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
              <button type="button" onClick={handleAddToCart}
                className="w-full rounded-full py-4 font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--green)" }}>
                Ajouter au panier →
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

          {/* Fiche produit */}
          {(product.ficheIntro || product.fiche) && (
            <div className="space-y-5 pt-2">
              {product.ficheIntro && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
                  {product.ficheIntro}
                </p>
              )}
              {product.ficheBadges && (
                <div className="flex flex-wrap gap-2">
                  {product.ficheBadges.map(badge => (
                    <span
                      key={badge}
                      className="rounded-full border px-3 py-1 text-xs font-medium"
                      style={{ borderColor: "var(--border)", color: "var(--ink)", backgroundColor: "white" }}
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              )}
              {product.fiche && (
                <div className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "var(--border)" }}>
                  <p className="px-5 pb-1 pt-4 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    Caractéristiques
                  </p>
                  {product.fiche.map(row => (
                    <div key={row.label} className="flex gap-4 border-t px-5 py-3" style={{ borderColor: "var(--border)" }}>
                      <span className="w-24 shrink-0 text-sm font-medium" style={{ color: "var(--muted)" }}>{row.label}</span>
                      <span className="text-sm leading-relaxed text-stone-700">{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── MODAL GUIDE DES TAILLES ── */}
      {showSizeGuide && (product.sizeGuideImage || product.sizeGuide) && (() => {
        const showImg = !!product.sizeGuideImage && !guideImgError;
        return (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={() => setShowSizeGuide(false)}
          >
            <div
              className={`w-full ${showImg ? "max-w-3xl" : "max-w-lg"} rounded-2xl bg-white p-7 shadow-2xl`}
              onClick={e => e.stopPropagation()}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl text-stone-900">Guide des tailles</h3>
                  <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>{product.label}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSizeGuide(false)}
                  aria-label="Fermer"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl transition hover:bg-stone-100"
                  style={{ color: "var(--muted)" }}
                >
                  ×
                </button>
              </div>

              {showImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.sizeGuideImage}
                  alt={`Guide des tailles ${product.label}`}
                  className="max-h-[75vh] w-full rounded-xl object-contain"
                  onError={() => setGuideImgError(true)}
                />
              ) : product.sizeGuide ? (
                <>
                  <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border)" }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: "#faf9f7" }}>
                          <th className="px-4 py-2.5 text-left font-semibold text-stone-700">Mesure (cm)</th>
                          {product.sizeGuide.columns.map(col => (
                            <th key={col} className="px-2 py-2.5 text-center font-semibold text-stone-700">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {product.sizeGuide.rows.map(row => (
                          <tr key={row.label} className="border-t" style={{ borderColor: "var(--border)" }}>
                            <td className="px-4 py-2.5 font-medium" style={{ color: "var(--muted)" }}>{row.label}</td>
                            {row.values.map((v, i) => (
                              <td key={i} className="px-2 py-2.5 text-center text-stone-800">{v}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {product.sizeGuide.note && (
                    <p className="mt-4 text-xs leading-relaxed" style={{ color: "var(--muted)" }}>
                      {product.sizeGuide.note}
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
