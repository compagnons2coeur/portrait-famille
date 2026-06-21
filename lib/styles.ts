const BASE = `Keep the exact appearance, face, fur color, markings and breed of the animal from the reference image. Preserve its identity completely.`;

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
    description: "Cosmonaute dans les étoiles",
    prompt: `${BASE}

Epic cinematic space portrait, NASA astronaut photoshoot aesthetic. The subject wears a full bright WHITE modern EVA spacesuit with colorful mission patches on the sleeves, a clear glass spherical helmet (open visor to reveal the face), and oxygen tubes along the chest. Background is deep space: Earth's blue and white curvature visible below, infinite star-filled cosmos above, soft purple and blue nebula. Dramatic cold rim lighting from the sun on one side. Photorealistic, ultra-detailed, IMAX quality.`,
  },
  {
    id: "baroque",
    nameFr: "Baroque",
    accent: "#8B4513",
    description: "Portrait royal à l'huile",
    prompt: `${BASE}

Oil painting portrait in the style of 17th century Flemish baroque masters, Rembrandt and Van Dyck. Dramatic chiaroscuro lighting, deep shadows and warm golden candlelight on one side of the face. The subject wears an ornate royal aristocrat costume: deep crimson velvet cape with gold embroidery, a white lace ruff collar around the neck, and a jeweled gold brooch on the chest. Background features heavy draped burgundy curtains with golden tassels. Rich impasto oil paint texture, visible brushstrokes, aged canvas feel. Regal, majestic, museum-quality composition.`,
  },
  {
    id: "magazine",
    nameFr: "Compagnons de Cœur",
    accent: "#C9A84C",
    description: "Star de couverture de magazine",
    prompt: `${BASE}

Glossy luxury fashion magazine cover aesthetic. The subject wears oversized black designer sunglasses, a tailored ivory structured blazer, and a chunky gold chain necklace. High-key studio lighting, perfectly retouched. Bold magazine layout: large elegant serif white text "COMPAGNONS DE COEUR" at the very top as the magazine masthead. No other text on the image. Dark moody background. Vibrant, ultra-sharp, glamorous.`,
  },
  {
    id: "influenceur",
    nameFr: "Influenceur en vacances",
    accent: "#F4A261",
    description: "Lifestyle tropical & bonne humeur",
    prompt: `${BASE}

Bright tropical beach lifestyle photo, golden hour sunlight, warm lens flare. The subject wears a colorful Hawaiian flower lei garland around the neck, oversized round mirrored sunglasses, and a tiny tilted straw hat. Background: turquoise ocean, white sand beach, blurred palm trees. Saturated warm colors, Instagram-perfect composition. Joyful, carefree.`,
  },
  {
    id: "montagne",
    nameFr: "Au sommet d'une montagne",
    accent: "#5D8AA8",
    description: "Aventurier conquérant les sommets",
    prompt: `${BASE}

Epic adventure photography at a snowy mountain summit, golden hour. The subject wears a red down jacket with fur-trimmed hood, a wool scarf around the neck. Background: breathtaking panoramic view of snow-capped peaks, clouds below, warm orange and pink sky. Low angle shot, triumphant atmosphere. National Geographic quality.`,
  },
  {
    id: "argentique",
    nameFr: "Argentique",
    accent: "#A0855B",
    description: "Photo pellicule années 90",
    prompt: `${BASE}

Authentic 35mm film photography, Kodak Portra 400 aesthetic. Visible film grain, warm faded color shift, soft corner vignetting. The subject wears a cozy vintage mustard yellow knit sweater with a small enamel pin on the collar. Natural window light, slightly underexposed, intimate and nostalgic 1990s feel.`,
  },
  {
    id: "cartoon",
    nameFr: "Cartoon",
    accent: "#E76F51",
    description: "Animation Pixar haute définition",
    prompt: `${BASE}

Vibrant Pixar 3D animated movie still, soft subsurface fur rendering, expressive eyes with detailed catchlights. The subject wears a colorful adventurer outfit: khaki explorer jacket with brass buttons, red neckerchief, tiny leather backpack. Warm studio lighting, pastel bokeh background. Playful, heartwarming, family movie quality.`,
  },
  {
    id: "studio-couleur",
    nameFr: "Studio photo",
    accent: "#6B7280",
    description: "Portrait professionnel fond blanc",
    prompt: `${BASE}

High-end professional studio pet portrait, medium format camera, 85mm f/1.4 lens. Perfect three-point lighting: softbox key light at 45°, fill reflector, rim light. Clean white seamless backdrop. Tack-sharp focus on eyes, creamy bokeh. Natural colors, subtle contrast. Commercial editorial quality. Pure solid white background, no studio equipment, no light boxes, no shadows, no gradient, seamless white backdrop only.`,
  },
  {
    id: "studio-nb",
    nameFr: "Studio noir & blanc",
    accent: "#1C1C1C",
    description: "Élégance intemporelle en N&B",
    prompt: `${BASE}

Timeless black and white fine art studio portrait, medium format camera. Dramatic single key light from 45°, deep shadows, strong contrast. Clean white seamless backdrop. Tack-sharp focus on eyes and fur texture, silky bokeh. Rich blacks, pure whites, full tonal range. Helmut Newton meets Irving Penn aesthetic. Elegant, powerful, timeless.`,
  },
];

export function getStyleById(id: string): Style | undefined {
  return STYLES.find((style) => style.id === id);
}

export function buildPrompt(styleId: string): string {
  const style = getStyleById(styleId);
  if (!style) {
    throw new Error(`Style inconnu: ${styleId}`);
  }
  return style.prompt;
}
