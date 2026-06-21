const BASE = `Keep the exact appearance, faces, hair, skin tones and features of all family members from the reference image. Preserve every identity completely. Show all family members together in the scene.`;

export interface Style {
  id: string;
  nameFr: string;
  accent: string;
  prompt: string;
  description: string;
}

export const STYLES: Style[] = [
  {
    id: "sans-ia",
    nameFr: "Photo originale",
    accent: "#6B7280",
    description: "Votre photo telle quelle, sans modification",
    prompt: "",
  },
  {
    id: "espace",
    nameFr: "Espace",
    accent: "#1E3A5F",
    description: "Famille de cosmonautes",
    prompt: `${BASE}

Epic cinematic space family portrait. All family members wear full bright WHITE modern EVA spacesuits scaled to their sizes (smaller suits for children), clear glass spherical helmets (open visors). Deep space background: Earth curvature, star-filled cosmos, blue and purple nebula. Dramatic rim lighting. Photorealistic, IMAX quality.`,
  },
  {
    id: "baroque",
    nameFr: "Baroque",
    accent: "#8B4513",
    description: "Portrait royal à l'huile",
    prompt: `${BASE}

Oil painting family portrait, 17th century Flemish baroque masters style. Dramatic chiaroscuro lighting. All family members wear ornate royal aristocrat costumes appropriate to their age: adults in crimson velvet capes and lace ruffs, children in period-accurate noble attire. Heavy draped background. Museum-quality composition.`,
  },
  {
    id: "magazine",
    nameFr: "Compagnons de Cœur",
    accent: "#C9A84C",
    description: "Famille en couverture de magazine",
    prompt: `${BASE}

Glossy luxury family magazine cover. All members styled for a high-fashion editorial: adults in tailored ivory blazers and sunglasses, children in matching outfits. Bold serif white text "COMPAGNONS DE COEUR" at the top. Dark moody background. Ultra-sharp, glamorous family portrait.`,
  },
  {
    id: "influenceur",
    nameFr: "En vacances",
    accent: "#F4A261",
    description: "Vacances en famille & bonne humeur",
    prompt: `${BASE}

Bright tropical beach family lifestyle photo, golden hour. All family members wear Hawaiian flower leis, matching straw hats, colorful summer outfits. Turquoise ocean, white sand, palm trees background. Warm saturated colors. Joyful, carefree family vacation atmosphere.`,
  },
  {
    id: "montagne",
    nameFr: "Sommet de montagne",
    accent: "#5D8AA8",
    description: "Aventure en famille aux sommets",
    prompt: `${BASE}

Epic adventure family photography at a snowy mountain summit, golden hour. All family members wear matching red down jackets (smaller sizes for children), wool scarves. Snow-capped peaks panorama background. Triumphant atmosphere, all together. National Geographic quality.`,
  },
  {
    id: "argentique",
    nameFr: "Argentique",
    accent: "#A0855B",
    description: "Photo de famille pellicule années 90",
    prompt: `${BASE}

Authentic 35mm family film photography, Kodak Portra 400 aesthetic. Film grain, warm faded colors, corner vignetting. All family members wear cozy vintage knit sweaters. Natural window light, intimate nostalgic 1990s family portrait feel.`,
  },
  {
    id: "cartoon",
    nameFr: "Cartoon",
    accent: "#E76F51",
    description: "Animation Pixar haute définition",
    prompt: `${BASE}

Vibrant Pixar 3D animated family movie still. All family members wear colorful adventurer outfits scaled to their sizes. Children have expressive oversized eyes. Warm studio lighting, pastel bokeh background. Playful, heartwarming, perfect family movie quality.`,
  },
  {
    id: "studio-couleur",
    nameFr: "Studio photo",
    accent: "#6B7280",
    description: "Portrait famille fond blanc",
    prompt: `${BASE}

High-end professional studio family portrait, 85mm lens. Perfect three-point lighting. Pure white seamless backdrop. All family members sharp and well-lit. Natural colors. Commercial editorial quality.`,
  },
  {
    id: "studio-nb",
    nameFr: "Studio noir & blanc",
    accent: "#1C1C1C",
    description: "Élégance intemporelle en N&B",
    prompt: `${BASE}

Timeless black and white fine art studio family portrait. Dramatic key light, strong contrast. White seamless backdrop. Rich blacks, pure whites. Elegant, powerful, timeless family legacy portrait.`,
  },
];

export function getStyleById(id: string): Style | undefined {
  return STYLES.find((style) => style.id === id);
}

export function buildPrompt(styleId: string): string {
  const style = getStyleById(styleId);
  if (!style) throw new Error(`Style inconnu: ${styleId}`);
  return style.prompt;
}
