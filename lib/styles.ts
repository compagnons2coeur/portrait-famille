const BASE = `Keep the exact appearance, faces, hair, skin tones and features of all family members from the reference image. Preserve every identity completely. Show all family members together in the scene.`;

export interface Style {
  id: string;
  nameFr: string;
  accent: string;
  prompt: string;
  description: string;
  /** Regroupement affiché dans le tunnel. */
  category: "elegant" | "fun";
  /**
   * Post-traitement fond transparent :
   * - "cutout" = détourage IA seul (photos studio).
   * - "ink"    = détourage IA + blanc → alpha (traits nets : croquis, line art).
   * - "wash"   = blanc → alpha SEUL, sans détourage (aquarelle : garde les
   *              tâches de couleur et les bords doux, pas de segmentation dure).
   */
  transparent?: "cutout" | "ink" | "wash";
  /** If set, the family/subject name is appended to the prompt using this template. Use {name} as placeholder. */
  nameTemplate?: string;
}

export const STYLES: Style[] = [
  // ── Styles élégants ──────────────────────────────────────────────────────
  {
    id: "sans-ia",
    nameFr: "Photo originale",
    accent: "#6B7280",
    category: "elegant",
    description: "Votre photo telle quelle, sans modification",
    prompt: "",
  },
  {
    id: "studio-couleur",
    nameFr: "Studio photo",
    accent: "#6B7280",
    category: "elegant",
    transparent: "cutout",
    description: "Portrait professionnel détouré",
    prompt: `${BASE}

High-end professional studio family portrait, medium format camera, 85mm f/1.4 lens. Perfect three-point lighting: softbox key light at 45°, fill reflector, rim light. Clean white seamless backdrop. Tack-sharp focus on eyes, creamy bokeh. Natural colors, subtle contrast. Commercial editorial quality. Pure solid white background, no studio equipment, no light boxes, no shadows, no gradient, seamless white backdrop only.`,
  },
  {
    id: "studio-nb",
    nameFr: "Studio noir & blanc",
    accent: "#1C1C1C",
    category: "elegant",
    transparent: "cutout",
    description: "Élégance intemporelle en N&B",
    prompt: `${BASE}

Timeless black and white fine art studio portrait, medium format camera. Dramatic single key light from 45°, deep shadows, strong contrast. Clean white seamless backdrop. Tack-sharp focus on eyes and fur texture, silky bokeh. Rich blacks, pure whites, full tonal range. Helmut Newton meets Irving Penn aesthetic. Elegant, powerful, timeless.`,
  },
  {
    id: "aquarelle",
    nameFr: "Aquarelle",
    accent: "#9CAA82",
    category: "elegant",
    transparent: "wash",
    description: "Peinture aquarelle douce et vibrante",
    prompt: `${BASE}

Delicate watercolor painting portrait. Soft translucent washes of color, wet-on-wet blending, expressive pigmented paint bleeds, splatters and watercolor droplets around the subject with clearly visible, saturated color. Detailed rendering of the face and eyes, loose unfinished brushwork fading toward the edges. Distinct sage green, peach and terracotta accent splashes with enough pigment density to stay clearly visible, not washed out. Remove the original photo background completely — no trace of the photo's surroundings may remain anywhere. The entire background must be flat pure white, no paper texture, no grain, no shadows. Tender, artistic, gallery quality.`,
  },
  {
    id: "croquis",
    nameFr: "Croquis crayon",
    accent: "#8A857C",
    category: "elegant",
    transparent: "ink",
    description: "Dessin au crayon — prénom calligraphié inclus",
    prompt: `${BASE}

Classical graphite pencil sketch portrait. Fine crosshatching and delicate shading, confident expressive sketch lines, highly detailed eyes full of life, loose unfinished edges fading away. Monochrome graphite grey tones only, no color. Remove the original photo background completely — no trace of the photo's surroundings may remain anywhere. The entire background must be flat pure white, no paper texture, no grain, no shadows, no vignette.`,
    nameTemplate: `Below the portrait, the name "{name}" is handwritten in elegant flowing pencil script lettering, as if signed by the artist, in the same graphite grey tone as the sketch. The name is spelled exactly "{name}", with no other text anywhere.`,
  },
  {
    id: "line-art",
    nameFr: "Line art minimaliste",
    accent: "#1C1C1C",
    category: "elegant",
    transparent: "ink",
    description: "Trait épuré — le prénom dessiné dans la ligne",
    prompt: `${BASE}

Minimalist continuous line art portrait. Elegant thin black lines capturing the essence of the subject with as few strokes as possible, flowing organic curves, subtle details on the eyes and muzzle. No shading, no color, no fill: pure black line work only. Remove the original photo background completely — no trace of the photo's surroundings may remain anywhere. The entire background must be flat pure white, no texture, no shadows.`,
    nameTemplate: `The single continuous line flows down from the portrait and elegantly writes the name "{name}" in cursive handwriting below it, connected to the portrait as one unbroken line, same thin black stroke. The name is spelled exactly "{name}", with no other text anywhere.`,
  },
  {
    id: "argentique",
    nameFr: "Argentique",
    accent: "#A0855B",
    category: "elegant",
    description: "Photo pellicule années 90",
    prompt: `${BASE}

Authentic 35mm film photography, Kodak Portra 400 aesthetic. Visible film grain, warm faded color shift, soft corner vignetting. The subject wears a cozy vintage mustard yellow knit sweater with a small enamel pin on the collar. Natural window light, slightly underexposed, intimate and nostalgic 1990s feel.`,
  },

  // ── Styles fun ───────────────────────────────────────────────────────────
  {
    id: "espace",
    nameFr: "Espace",
    accent: "#1E3A5F",
    category: "fun",
    description: "Cosmonaute dans les étoiles",
    prompt: `${BASE}

Epic cinematic space portrait, NASA astronaut photoshoot aesthetic. The subject wears a full bright WHITE modern EVA spacesuit with colorful mission patches on the sleeves, a clear glass spherical helmet (open visor to reveal the face), and oxygen tubes along the chest. Background is deep space: Earth's blue and white curvature visible below, infinite star-filled cosmos above, soft purple and blue nebula. Dramatic cold rim lighting from the sun on one side. Photorealistic, ultra-detailed, IMAX quality.`,
  },
  {
    id: "baroque",
    nameFr: "Baroque",
    accent: "#8B4513",
    category: "fun",
    description: "Portrait royal à l'huile",
    prompt: `${BASE}

Oil painting portrait in the style of 17th century Flemish baroque masters, Rembrandt and Van Dyck. Dramatic chiaroscuro lighting, deep shadows and warm golden candlelight on one side of the face. The subject wears an ornate royal aristocrat costume: deep crimson velvet cape with gold embroidery, a white lace ruff collar around the neck, and a jeweled gold brooch on the chest. Background features heavy draped burgundy curtains with golden tassels. Rich impasto oil paint texture, visible brushstrokes, aged canvas feel. Regal, majestic, museum-quality composition.`,
  },
  {
    id: "magazine",
    nameFr: "Compagnons de Cœur",
    accent: "#C9A84C",
    category: "fun",
    description: "Star de couverture de magazine",
    prompt: `${BASE}

Glossy luxury fashion magazine cover aesthetic. The subject wears oversized black designer sunglasses, a tailored ivory structured blazer, and a chunky gold chain necklace. High-key studio lighting, perfectly retouched. Bold magazine layout: large elegant serif white text "COMPAGNONS DE COEUR" at the very top as the magazine masthead. No other text on the image. Dark moody background. Vibrant, ultra-sharp, glamorous.`,
  },
  {
    id: "influenceur",
    nameFr: "Influenceur en vacances",
    accent: "#F4A261",
    category: "fun",
    description: "Lifestyle tropical & bonne humeur",
    prompt: `${BASE}

Bright tropical beach lifestyle photo, golden hour sunlight, warm lens flare. The subject wears a colorful Hawaiian flower lei garland around the neck, oversized round mirrored sunglasses, and a tiny tilted straw hat. Background: turquoise ocean, white sand beach, blurred palm trees. Saturated warm colors, Instagram-perfect composition. Joyful, carefree.`,
  },
  {
    id: "montagne",
    nameFr: "Au sommet d'une montagne",
    accent: "#5D8AA8",
    category: "fun",
    description: "Aventurier conquérant les sommets",
    prompt: `${BASE}

Epic adventure photography at a snowy mountain summit, golden hour. The subject wears a red down jacket with fur-trimmed hood, a wool scarf around the neck. Background: breathtaking panoramic view of snow-capped peaks, clouds below, warm orange and pink sky. Low angle shot, triumphant atmosphere. National Geographic quality.`,
  },
  {
    id: "cartoon",
    nameFr: "Cartoon",
    accent: "#E76F51",
    category: "fun",
    description: "Animation 3D haute définition",
    prompt: `${BASE}

Vibrant 3D animated movie still, soft subsurface fur rendering, expressive eyes with detailed catchlights. The subject wears a colorful adventurer outfit: khaki explorer jacket with brass buttons, red neckerchief, tiny leather backpack. Warm studio lighting, pastel bokeh background. Playful, heartwarming, family movie quality.`,
  },
  {
    id: "pop-art",
    nameFr: "Pop art",
    accent: "#E63976",
    category: "fun",
    description: "Couleurs vives façon sérigraphie",
    prompt: `${BASE}

Bold 1960s pop art screen-print portrait. Thick black outlines, flat vibrant saturated color blocks: electric blue, hot pink, sunshine yellow and orange. High contrast, subtle halftone dot texture in the background, silkscreen poster aesthetic. Punchy, energetic, iconic gallery print.`,
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
