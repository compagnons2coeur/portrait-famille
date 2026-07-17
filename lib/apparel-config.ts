/** Config partagée t-shirt / sweat — 12 couleurs, mode overlay v2. */

export const APPAREL_SIZES = ["XS", "S", "M", "L", "XL"] as const;

export const APPAREL_COLORS = [
  "Off White",
  "Noir",
  "Aloe",
  "Blue Soul",
  "Bright Blue",
  "Desert Dust",
  "Glazed Green",
  "Jaune",
  "Lavande",
  "Pêche",
  "Rose",
  "Rouge",
] as const;

export type ApparelColor = (typeof APPAREL_COLORS)[number];

export const APPAREL_COLOR_SLUGS: Record<ApparelColor, string> = {
  "Off White": "off-white",
  Noir: "noir",
  Aloe: "aloe",
  "Blue Soul": "blue-soul",
  "Bright Blue": "bright-blue",
  "Desert Dust": "desert-dust",
  "Glazed Green": "glazed-green",
  Jaune: "jaune",
  Lavande: "lavande",
  Pêche: "peche",
  Rose: "rose",
  Rouge: "rouge",
};

/** Pastilles UI — approximations Stanley/Stella. */
export const APPAREL_COLOR_HEX: Record<ApparelColor, string> = {
  "Off White": "#f5efe6",
  Noir: "#1a1a1a",
  Aloe: "#b8c99a",
  "Blue Soul": "#7a96b0",
  "Bright Blue": "#2d6cb5",
  "Desert Dust": "#c9a66b",
  "Glazed Green": "#96a88c",
  Jaune: "#f2d046",
  Lavande: "#c4b5d6",
  Pêche: "#f0b896",
  Rose: "#e8a4b8",
  Rouge: "#c72c48",
};

export const TSHIRT_PRICE = 29.9;
export const SWEAT_PRICE = 69.9;

/** Mockups « design seul » — 1 crédit par emplacement, toutes couleurs. */
export const TSHIRT_OVERLAY_MOCKUPS = [
  { side: "avant" as const, placement: "petit-coeur", mockupUuid: "418c16f7-0fd8-41f4-899c-1b5943ff42a3", smartObjectUuid: "4ed05e2f-a462-49cd-8a60-4e097e26ee5b" },
  { side: "avant" as const, placement: "petit-centre", mockupUuid: "23265156-7ea2-4d85-a24a-19a59af9e162", smartObjectUuid: "276124c2-4e14-41a6-9276-a34e1076c095" },
  { side: "avant" as const, placement: "grand", mockupUuid: "1e84c007-3cfc-4757-8424-225c2219ec6a", smartObjectUuid: "fcc6091a-6412-46ac-bf19-59fa04e28d77" },
  { side: "arriere" as const, placement: "petit-centre", mockupUuid: "7598c4f0-3e72-4f78-aa22-b086b518cff4", smartObjectUuid: "e5a9a2d2-f94d-47e4-bdbe-766d56b4b490" },
  { side: "arriere" as const, placement: "grand", mockupUuid: "12552202-9364-442a-8a62-8f577733f762", smartObjectUuid: "9e332fe0-4dc5-4347-aff5-aebcd1a03748" },
];

export const SWEAT_OVERLAY_MOCKUPS = [
  { side: "avant" as const, placement: "petit-coeur", mockupUuid: "d614d5de-557a-487e-b815-ae7ff4d654b8", smartObjectUuid: "c54d6607-1c12-4ba0-9be4-7cfe183fb326" },
  { side: "avant" as const, placement: "grand", mockupUuid: "52677178-dcdd-4ac3-9d35-d80c5e260145", smartObjectUuid: "45b54999-c69f-4f74-adfc-a5938704847c" },
  { side: "arriere" as const, mockupUuid: "f2bc6684-e32e-4bf3-b169-33687bbee297", smartObjectUuid: "15bc366a-98e8-410a-bfd0-acc797d9d738" },
];

/** IDs Shopify par couleur (XS → XL). Source : scripts/list-variants.mjs */
const TSHIRT_VARIANT_IDS: Record<ApparelColor, number[]> = {
  "Off White": [53838635204951, 53838635237719, 53838635270487, 53838635303255, 53838637400407],
  Noir: [53927597211991, 53927597244759, 53927597277527, 53927597310295, 53927597343063],
  Aloe: [53934274478423, 53934274511191, 53934274543959, 53934274576727, 53934274609495],
  "Blue Soul": [53934274642263, 53934274675031, 53934274707799, 53934274740567, 53934274773335],
  "Bright Blue": [53934274806103, 53934274838871, 53934274871639, 53934274904407, 53934274937175],
  "Desert Dust": [53934274969943, 53934275002711, 53934275035479, 53934275068247, 53934275101015],
  "Glazed Green": [53934275133783, 53934275166551, 53934275199319, 53934275232087, 53934275264855],
  Jaune: [53934275297623, 53934275330391, 53934275363159, 53934275395927, 53934275428695],
  Lavande: [53934275461463, 53934275494231, 53934275526999, 53934275559767, 53934275592535],
  Pêche: [53934275625303, 53934275658071, 53934275690839, 53934275723607, 53934275756375],
  Rose: [53934275789143, 53934275821911, 53934275854679, 53934275887447, 53934275920215],
  Rouge: [53934275952983, 53934275985751, 53934276018519, 53934276051287, 53934276084055],
};

const SWEAT_VARIANT_IDS: Record<ApparelColor, number[]> = {
  "Off White": [53838637465943, 53838637498711, 53838637531479, 53838637564247, 53838637597015],
  Noir: [53927744307543, 53927744340311, 53927744373079, 53927744405847, 53927744438615],
  Aloe: [53934392312151, 53934392344919, 53934392377687, 53934392410455, 53934392443223],
  "Blue Soul": [53934392475991, 53934392508759, 53934392541527, 53934392574295, 53934392607063],
  "Bright Blue": [53934392639831, 53934392672599, 53934392705367, 53934392738135, 53934392770903],
  "Desert Dust": [53934392803671, 53934392836439, 53934392869207, 53934392901975, 53934392934743],
  "Glazed Green": [53934392967511, 53934393000279, 53934393033047, 53934393065815, 53934393098583],
  Jaune: [53934393131351, 53934393164119, 53934393196887, 53934393229655, 53934393262423],
  Lavande: [53934393295191, 53934393327959, 53934393360727, 53934393393495, 53934393426263],
  Pêche: [53934393459031, 53934393491799, 53934393524567, 53934393557335, 53934393590103],
  Rose: [53934393622871, 53934393655639, 53934393688407, 53934393721175, 53934393753943],
  Rouge: [53934393786711, 53934393819479, 53934393852247, 53934393885015, 53934393917783],
};

function buildVariants(
  idsByColor: Record<ApparelColor, number[]>,
  price: number,
): Record<string, { variantId: number; price: number }> {
  const out: Record<string, { variantId: number; price: number }> = {};
  for (const color of APPAREL_COLORS) {
    APPAREL_SIZES.forEach((size, i) => {
      out[`${color}-${size}`] = { variantId: idsByColor[color][i], price };
    });
  }
  return out;
}

export function buildBaseImageByColor(kind: "tshirt" | "sweat"): Record<string, Partial<Record<"avant" | "arriere", string>>> {
  const out: Record<string, Partial<Record<"avant" | "arriere", string>>> = {};
  for (const color of APPAREL_COLORS) {
    const slug = APPAREL_COLOR_SLUGS[color];
    out[color] = {
      avant: `/apparel/${kind}/${slug}-avant.jpg`,
      arriere: `/apparel/${kind}/${slug}-arriere.jpg`,
    };
  }
  return out;
}

export const TSHIRT_VARIANTS = buildVariants(TSHIRT_VARIANT_IDS, TSHIRT_PRICE);
export const SWEAT_VARIANTS = buildVariants(SWEAT_VARIANT_IDS, SWEAT_PRICE);

export const APPAREL_COLOR_MAP: Record<ApparelColor, string> = APPAREL_COLOR_HEX;
