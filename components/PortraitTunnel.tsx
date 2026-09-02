"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { STYLES, type Style } from "@/lib/styles";
import { MAX_UPLOAD_BYTES, POLL_INTERVAL_MS } from "@/lib/constants";
import { applyWatermark, compressImage, isValidImageFile } from "@/lib/image-utils";
import { trackTikTok } from "@/lib/tiktok";
import SupportSelector, { type CartItemInput } from "@/components/SupportSelector";
import CropModal from "@/components/CropModal";

type Step = "upload" | "pet-name" | "style" | "generating" | "result" | "support";

type CartItem = CartItemInput & { id: string };

type GenHistoryItem = {
  id: string;
  styleName: string;
  originalImageUrl: string;
  watermarkedImageUrl: string;
  blobImageUrl: string | null;
  aspectRatio: string;
};

function fmtPrice(price: number) {
  return price.toFixed(2).replace(".", ",") + "€";
}

const BLOCKED_MESSAGE =
  "Vous avez utilisé vos 5 générations gratuites du jour. Revenez demain ou passez commande pour recevoir votre portrait en HD sans filigrane.";

/**
 * Exemples de portraits affichés en haut du tunnel (étape upload).
 * Objectif : montrer le résultat AVANT de demander l'upload, pour convaincre
 * le trafic froid (TikTok) qui n'a encore rien vu. Réutilise les vignettes de styles.
 */
const GALLERY_EXAMPLES: { src: string; label: string }[] = [
  { src: "/styles/aquarelle-gallery.jpg", label: "Aquarelle" },
  { src: "/styles/croquis-gallery.jpg", label: "Croquis crayon" },
  { src: "/styles/line-art-gallery.jpg", label: "Line art" },
  { src: "/styles/argentique-gallery.jpg", label: "Argentique" },
  { src: "/styles/espace-gallery.jpg", label: "Espace" },
  { src: "/styles/magazine-gallery.jpg", label: "Magazine" },
];

const PRODUCT_STRIP = [
  { label: "Tableau toile", price: "dès 19,90 €" },
  { label: "T-shirt", price: "19,90 €" },
  { label: "Sweat", price: "39,90 €" },
];

const CATEGORY_CHIPS = [
  { emoji: "🖼️", label: "Tableaux" },
  { emoji: "👕", label: "Textile & mode" },
];

const FAMILY_PLACEHOLDER = "/placeholders/portrait-famille.svg";

const SUPPORT_CATEGORIES = [
  {
    id: "tableaux",
    label: "Tableaux",
    products: [
      { id: "tableau-toile", label: "Tableau Toile",      emoji: "🖼️", prix: "dès 24,90€", available: true,  offerLandscape: true  },
      { id: "tableau-metal", label: "Tableau Métal",      emoji: "✨",  prix: "Bientôt", available: false,  offerLandscape: true  },
    ],
  },
  {
    id: "textile",
    label: "Textile & Mode",
    products: [
      { id: "tshirt",    label: "T-shirt",   emoji: "👕", prix: "dès 24,90€", available: true,  offerLandscape: false },
      { id: "sweat",     label: "Sweat",     emoji: "🧥", prix: "dès 34,90€", available: true,  offerLandscape: false },
      { id: "polo",      label: "Polo",      emoji: "👔", prix: "Bientôt", available: false, offerLandscape: false },
      { id: "tablier",   label: "Tablier",   emoji: "🍳", prix: "Bientôt", available: false, offerLandscape: false },
      { id: "body-bebe", label: "Body bébé", emoji: "👶", prix: "Bientôt", available: false, offerLandscape: false },
      { id: "pyjama",    label: "Pyjamas",   emoji: "😴", prix: "Bientôt", available: false, offerLandscape: false },
      { id: "casquette", label: "Casquette", emoji: "🧢", prix: "Bientôt",    available: false, offerLandscape: false },
    ],
  },
  {
    id: "accessoires",
    label: "Accessoires",
    products: [
      { id: "tote-bag",  label: "Tote bag",           emoji: "👜", prix: "Bientôt", available: false, offerLandscape: true  },
      { id: "coque",     label: "Coque téléphone",    emoji: "📱", prix: "Bientôt", available: false,  offerLandscape: false },
      { id: "porte-cle", label: "Porte-clé",          emoji: "🔑", prix: "Bientôt",  available: false,  offerLandscape: false },
      { id: "medaillon", label: "Médaillon famille",    emoji: "🐾", prix: "Bientôt", available: false,  offerLandscape: false },
      { id: "collier",   label: "Collier bijou",       emoji: "📿", prix: "Bientôt", available: false,  offerLandscape: false },
    ],
  },
  {
    id: "maison",
    label: "Maison & Déco",
    products: [
      { id: "mug",           label: "Mug",              emoji: "☕", prix: "Bientôt", available: false,  offerLandscape: true  },
      { id: "gourde",        label: "Gourde",           emoji: "🫙", prix: "Bientôt", available: false,  offerLandscape: false },
      { id: "tapis-souris",  label: "Tapis de souris",  emoji: "🖱️", prix: "Bientôt", available: false,  offerLandscape: true  },
      { id: "dessous-verre", label: "Dessous de verre", emoji: "🫗", prix: "Bientôt",  available: false,  offerLandscape: false },
      { id: "magnet",        label: "Magnet",           emoji: "🧲", prix: "Bientôt",  available: false,  offerLandscape: false },
      { id: "stickers",      label: "Stickers",         emoji: "🏷️", prix: "Bientôt",    available: false, offerLandscape: false },
    ],
  },
  {
    id: "cuisine",
    label: "Cuisine & Apéro",
    products: [
      { id: "planche-apero", label: "Planche apéro", emoji: "🧀", prix: "Bientôt", available: false, offerLandscape: true  },
      { id: "decapsuleur",   label: "Décapsuleur",   emoji: "🍺", prix: "Bientôt", available: false, offerLandscape: false },
    ],
  },
  {
    id: "papeterie",
    label: "Papeterie & Souvenirs",
    products: [
      { id: "marque-page", label: "Marque-page bois", emoji: "📖", prix: "Bientôt", available: false,  offerLandscape: true  },
      { id: "badge",       label: "Badge",             emoji: "🏅", prix: "Bientôt", available: false,  offerLandscape: false },
      { id: "puzzle",      label: "Puzzle",            emoji: "🧩", prix: "Bientôt",   available: false, offerLandscape: true  },
    ],
  },
  {
    id: "animaux",
    label: "Univers Animaux",
    products: [
      { id: "gamelle", label: "Gamelle animaux", emoji: "🐾", prix: "Bientôt", available: false, offerLandscape: true },
    ],
  },
];

const SUPPORT_PRODUCTS = SUPPORT_CATEGORIES.flatMap(c => c.products);

type CatalogProduct = {
  id: string; label: string; emoji: string; price: string; baseImage: string;
  artwork: { top: string; left: string; width: string; height: string };
  styleIds: string[];
};

const CATALOG_PRODUCTS: CatalogProduct[] = [
  { id: "tableau-toile", label: "Tableau toile", emoji: "🖼️", price: "dès 24,90 €", baseImage: "/decor/salon-toile.jpg", artwork: { top: "12%", left: "25%", width: "47%", height: "52%" }, styleIds: ["aquarelle", "argentique", "espace", "baroque", "magazine", "montagne"] },
  { id: "tshirt", label: "T-shirt", emoji: "👕", price: "dès 24,90 €", baseImage: "/apparel/tshirt/off-white-avant.jpg", artwork: { top: "31%", left: "35%", width: "30%", height: "34%" }, styleIds: ["studio-couleur", "studio-nb", "aquarelle", "croquis", "line-art"] },
  { id: "sweat", label: "Sweat", emoji: "🧥", price: "dès 34,90 €", baseImage: "/apparel/sweat/off-white-avant.jpg", artwork: { top: "36%", left: "36%", width: "28%", height: "27%" }, styleIds: ["studio-couleur", "studio-nb", "aquarelle", "croquis", "line-art"] },
];

function CatalogPreview({ product, style }: { product: CatalogProduct; style: Style }) {
  const isTableau = product.id === "tableau-toile";
  return <div className="relative aspect-[3/4] w-full overflow-hidden bg-stone-100">
    {/* eslint-disable-next-line @next/next/no-img-element */}<img src={product.baseImage} alt="" className="absolute inset-0 h-full w-full object-cover" />
    <div className={`absolute overflow-hidden ${isTableau ? "bg-white shadow-lg" : ""}`} style={{ ...product.artwork }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}<img src={FAMILY_PLACEHOLDER} alt={`Visuel ${style.nameFr} à remplacer`} className="h-full w-full object-cover" style={{ mixBlendMode: isTableau ? "normal" : "multiply" }} />
    </div>
    <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-stone-600 shadow-sm">Exemple</span>
    <span className="absolute bottom-2 left-2 right-2 rounded-lg bg-stone-900/70 px-2 py-1 text-center text-[9px] font-bold text-white">Visuel Famille à remplacer</span>
  </div>;
}

// Valide que le paramètre ?produit= correspond à un id de support connu.
function resolveProductParam(raw: string | null): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().trim();
  const ids = SUPPORT_PRODUCTS.map(p => p.id);
  return ids.includes(v) ? v : null;
}

const PROGRESS_STEPS = [
  { pct: 8,  msg: "Analyse de votre famille en cours…" },
  { pct: 20, msg: "Identification des traits distinctifs…" },
  { pct: 35, msg: "Application du style artistique…" },
  { pct: 50, msg: "Ajout des détails et textures…" },
  { pct: 65, msg: "Mise en scène du portrait…" },
  { pct: 78, msg: "Finalisation des couleurs…" },
  { pct: 88, msg: "Dernières retouches…" },
  { pct: 94, msg: "Presque prêt…" },
];

export default function PortraitTunnel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isExamplePhoto, setIsExamplePhoto] = useState(false);
  const [showCropModal, setShowCropModal] = useState(false);
  const [petName, setPetName] = useState("");
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [watermarkedImageUrl, setWatermarkedImageUrl] = useState<string | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [blobImageUrl, setBlobImageUrl] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState("Nous préparons votre portrait…");
  const [progressPct, setProgressPct] = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("tableau-toile");
  const [generationAspectRatio, setGenerationAspectRatio] = useState<string>("3:4");
  const [pendingProduct, setPendingProduct] = useState<string | null>(null);
  const [preselectedProduct, setPreselectedProduct] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [showStyleConfirm, setShowStyleConfirm] = useState(false);
  const [history, setHistory] = useState<GenHistoryItem[]>([]);

  // Affiche le résultat et l'ajoute à l'historique des générations
  // (permet de revenir à un portrait précédent sans re-générer = zéro coût FAL).
  const showResult = (original: string, watermarked: string, blob: string | null) => {
    setOriginalImageUrl(original);
    setWatermarkedImageUrl(watermarked);
    setBlobImageUrl(blob);
    setHistory(prev => {
      const item: GenHistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        styleName: selectedStyle?.nameFr ?? "Portrait",
        originalImageUrl: original,
        watermarkedImageUrl: watermarked,
        blobImageUrl: blob,
        aspectRatio: generationAspectRatio,
      };
      return [item, ...prev.filter(p => p.originalImageUrl !== original)].slice(0, 12);
    });
    // Funnel : portrait affiché (étape 3 atteinte — l'utilisateur voit le résultat)
    trackTikTok("GenerationCompleted", { content_id: "tunnel-portrait-famille", content_name: selectedStyle?.id ?? "" });
    setStep("support");
  };

  const restoreFromHistory = (h: GenHistoryItem) => {
    setOriginalImageUrl(h.originalImageUrl);
    setWatermarkedImageUrl(h.watermarkedImageUrl);
    setBlobImageUrl(h.blobImageUrl);
    setGenerationAspectRatio(h.aspectRatio);
    setError(null);
    setStep("support");
  };

  // Catégories avec le produit présélectionné remonté en tête
  const displayCategories = useMemo(() => {
    if (!preselectedProduct) return SUPPORT_CATEGORIES;
    const preselProd = SUPPORT_PRODUCTS.find(p => p.id === preselectedProduct);
    if (!preselProd) return SUPPORT_CATEGORIES;
    const rest = SUPPORT_CATEGORIES.map(cat => ({
      ...cat,
      products: cat.products.filter(p => p.id !== preselectedProduct),
    })).filter(cat => cat.products.length > 0);
    return [{ id: "__preselected__", label: "Votre sélection", products: [preselProd] }, ...rest];
  }, [preselectedProduct]);

  // Lire ?produit= depuis l'URL (lien depuis une fiche produit Shopify)
  useEffect(() => {
    const search = new URLSearchParams(window.location.search);
    const raw = search.get("produit");
    const resolvedProduct = resolveProductParam(raw);
    setPreselectedProduct(resolvedProduct);
    if (resolvedProduct && CATALOG_PRODUCTS.some(product => product.id === resolvedProduct)) setSelectedProduct(resolvedProduct);
    setIsDemoMode(search.get("demo") === "cdc");
    // Pixel TikTok : entrée dans le tunnel (haut de funnel)
    // content_id requis par TikTok (sinon warning "Missing content_id" + attribution VSA dégradée)
    trackTikTok("ViewContent", {
      content_id: "tunnel-portrait-famille",
      content_type: "product",
      content_name: "Tunnel portrait famille",
      value: 19.9,
      currency: "EUR",
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Fallback si FingerprintJS échoue ou traîne (navigateurs intégrés TikTok/Instagram,
    // bloqueurs) : ID persisté en localStorage. Le tunnel ne doit JAMAIS rester bloqué
    // sans fingerprint — sinon le bouton Générer ne fait rien, silencieusement.
    const fallbackFp = (): string => {
      try {
        const stored = localStorage.getItem("cdc_fp");
        if (stored) return stored;
        const id = "fb-" + (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2) + Date.now().toString(36));
        localStorage.setItem("cdc_fp", id);
        return id;
      } catch {
        return "fb-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      }
    };
    // Si FingerprintJS n'a pas répondu en 3 s, on bascule sur le fallback.
    const timer = setTimeout(() => {
      if (!cancelled) setFingerprint(prev => prev ?? fallbackFp());
    }, 3000);
    FingerprintJS.load().then(fp => fp.get()).then(result => {
      if (!cancelled) { clearTimeout(timer); setFingerprint(prev => prev ?? result.visitorId); }
    }).catch(() => {
      if (!cancelled) { clearTimeout(timer); setFingerprint(prev => prev ?? fallbackFp()); }
    });
    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  useEffect(() => {
    return () => { if (photoPreview) URL.revokeObjectURL(photoPreview); };
  }, [photoPreview]);

  const resetError = () => setError(null);

  const handleFile = useCallback((file: File) => {
    resetError();
    setIsExamplePhoto(false);
    if (!isValidImageFile(file)) { setError("Format accepté : JPG ou PNG uniquement."); return; }
    if (file.size > MAX_UPLOAD_BYTES) { setError("L'image ne doit pas dépasser 15 Mo."); return; }
    setPhotoFile(file);
    setPhotoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return URL.createObjectURL(file); });
    // Funnel : photo choisie (étape 1 franchie)
    trackTikTok("PhotoUploaded", { content_id: "tunnel-portrait-famille" });
  }, []);

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const fetchCredits = async (fp: string) => {
    const params = new URLSearchParams({ fingerprint: fp });
    const response = await fetch(`/api/credits?${params}`);
    if (!response.ok) return null;
    const data = (await response.json()) as { remaining: number };
    return data.remaining;
  };

  const startGeneration = async (style: Style, emailValue?: string, aspectRatio: string = "3:4", isOptimization = false) => {
    if (!photoFile || !fingerprint) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (!isOptimization) {
        const remaining = await fetchCredits(fingerprint);
        setCreditsRemaining(remaining);
        if (remaining === 0) { setError(BLOCKED_MESSAGE); setIsSubmitting(false); return; }
      }

      const compressed = await compressImage(photoFile);
      const formData = new FormData();
      formData.append("photo", compressed, photoFile.name);
      formData.append("styleId", style.id);
      formData.append("fingerprint", fingerprint);
      formData.append("aspectRatio", aspectRatio);
      if (isOptimization) formData.append("optimize", "true");
      if (isOptimization && jobId) formData.append("sourceJobId", jobId);
      if (petName.trim()) formData.append("petName", petName.trim());
      if (emailValue) formData.append("email", emailValue);

      const response = await fetch("/api/generate", { method: "POST", body: formData });
      const data = (await response.json()) as { jobId?: string; error?: string };

      if (!response.ok) {
        if (response.status === 400 && data.error?.includes("email")) {
          setShowEmailModal(true); setIsSubmitting(false); return;
        }
        throw new Error(data.error ?? "Échec du lancement.");
      }
      if (!data.jobId) throw new Error("Identifiant de génération manquant.");

      setShowEmailModal(false);
      setJobId(data.jobId);
      setGenerationAspectRatio(aspectRatio);
      // Funnel : génération lancée (étape 2 franchie, style choisi)
      trackTikTok("GenerationStarted", { content_id: "tunnel-portrait-famille", content_name: style.id });
      setStep("generating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStyleSelect = (style: Style) => {
    resetError();
    setSelectedStyle(style);
    setShowStyleConfirm(true);
  };

  const handleConfirmGeneration = async () => {
    if (!selectedStyle || !fingerprint) return;
    resetError();

    if (selectedStyle.id === "sans-ia") {
      if (!photoFile) return;
      setStep("generating");
      setProgressPct(50);
      setGenerationMessage("Préparation de votre photo…");
      try {
        const compressed = await compressImage(photoFile);
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(compressed);
        });
        setProgressPct(75);
        setGenerationMessage("Application du filigrane…");
        const watermarked = await applyWatermark(dataUrl);
        let blobUrl: string | null = null;
        try {
          const uploadRes = await fetch("/api/upload-watermark", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl: watermarked }),
          });
          const uploadData = await uploadRes.json() as { url?: string };
          blobUrl = uploadData.url ?? null;
        } catch { /* fallback */ }
        // Héberge aussi l'original (sans filigrane) : la commande Shopify doit
        // contenir une URL courte, jamais l'image encodée en base64.
        let originalUrl = dataUrl;
        try {
          const origRes = await fetch("/api/upload-watermark", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          const origData = await origRes.json() as { url?: string };
          if (origData.url) originalUrl = origData.url;
        } catch { /* fallback */ }
        setProgressPct(100);
        setGenerationMessage("Photo prête !");
        await new Promise(resolve => setTimeout(resolve, 400));
        showResult(originalUrl, watermarked, blobUrl);
      } catch {
        setError("Une erreur est survenue. Veuillez réessayer.");
        setStep("style");
      }
      return;
    }

    if (isDemoMode && isExamplePhoto) {
      const demoUrl = FAMILY_PLACEHOLDER;
      setStep("generating");
      await new Promise(resolve => setTimeout(resolve, 1200));
      setProgressPct(100);
      setGenerationMessage("Portrait prêt !");
      await new Promise(resolve => setTimeout(resolve, 500));
      showResult(demoUrl, demoUrl, demoUrl);
      return;
    }

    const remaining = await fetchCredits(fingerprint);
    setCreditsRemaining(remaining);
    if (remaining === 0) { setError(BLOCKED_MESSAGE); return; }

    const params = new URLSearchParams({ fingerprint });
    const creditsResponse = await fetch(`/api/credits?${params}`);
    if (creditsResponse.ok) {
      const creditsData = (await creditsResponse.json()) as { needsEmail?: boolean };
      if (creditsData.needsEmail) { setShowEmailModal(true); return; }
    }
    await startGeneration(selectedStyle);
  };

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setEmailError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setEmailError("Veuillez entrer une adresse email valide."); return;
    }
    if (!selectedStyle) return;
    await startGeneration(selectedStyle, email.trim());
  };

  useEffect(() => {
    if (step !== "generating") { setProgressPct(0); return; }
    setProgressPct(0);
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < PROGRESS_STEPS.length) {
        setProgressPct(PROGRESS_STEPS[stepIndex].pct);
        setGenerationMessage(PROGRESS_STEPS[stepIndex].msg);
        stepIndex++;
      }
    }, 4000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    if (step !== "generating" || !jobId) return;
    let cancelled = false;
    let finishing = false; // verrou : la finalisation (détourage + filigrane) ne doit tourner qu'une fois
    const poll = async () => {
      try {
        if (finishing) return;
        const response = await fetch(`/api/status/${jobId}`);
        const data = (await response.json()) as { status: string; imageUrl?: string | null };
        if (cancelled || finishing) return;
        if (data.status === "completed" && data.imageUrl) {
          finishing = true;
          setProgressPct(100);

          // Styles à fond transparent : détourage + filigrane faits côté serveur
          // (les PNG transparents sont trop lourds pour repasser par le client).
          let finalUrl = data.imageUrl;
          let serverWatermarkUrl: string | null = null;
          const transparentMode = selectedStyle?.transparent;
          if (transparentMode) {
            setGenerationMessage("Préparation du fond transparent…");
            try {
              const tRes = await fetch("/api/transparent", {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageUrl: data.imageUrl, mode: transparentMode }),
              });
              const tData = await tRes.json() as { url?: string; watermarkedUrl?: string; error?: string };
              if (tData.url) {
                finalUrl = tData.url;
                serverWatermarkUrl = tData.watermarkedUrl ?? null;
              } else {
                console.error("[transparent] échec:", tRes.status, tData.error);
              }
            } catch (e) {
              console.error("[transparent] échec réseau/timeout:", e);
            }
          }

          if (serverWatermarkUrl) {
            if (!cancelled) {
              showResult(finalUrl, serverWatermarkUrl, serverWatermarkUrl);
            }
          } else {
            setGenerationMessage("Application du filigrane…");
            try {
              const watermarked = await applyWatermark(
                finalUrl,
                undefined,
                transparentMode ? "image/png" : "image/jpeg",
              );
              let blobUrl: string | null = null;
              try {
                const uploadRes = await fetch("/api/upload-watermark", {
                  method: "POST", headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ dataUrl: watermarked }),
                });
                const uploadData = await uploadRes.json() as { url?: string };
                blobUrl = uploadData.url ?? null;
              } catch { /* silently fallback */ }
              if (!cancelled) {
                showResult(finalUrl, watermarked, blobUrl);
              }
            } catch {
              if (!cancelled) {
                showResult(finalUrl, finalUrl, null);
              }
            }
          }
        } else if (data.status === "failed") {
          setError("La génération a échoué. Veuillez réessayer.");
          setStep("style");
        } else {
          setGenerationMessage("Votre portrait prend forme…");
        }
      } catch {
        if (!cancelled) setGenerationMessage("Connexion instable, nouvelle tentative…");
      }
    };
    void poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);
    return () => { cancelled = true; clearInterval(intervalId); };
  }, [step, jobId]);

  useEffect(() => {
    if (step !== "result" || !fingerprint) return;
    fetchCredits(fingerprint).then(remaining => {
      if (remaining !== null) setCreditsRemaining(remaining);
    });
  }, [step, fingerprint]);

  // ── Panier multi-portraits ──
  const cartTotal = cart.reduce((sum, item) => sum + item.unitPrice, 0);

  const addToCart = (item: CartItemInput) => {
    setCart(prev => [...prev, { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` }]);
    setCartError(null);
    setShowCartModal(true);
    // Pixel TikTok : ajout au panier (signal de conversion pour l'optimisation)
    trackTikTok("AddToCart", {
      content_id: item.productId,
      content_type: "product",
      content_name: item.label,
      quantity: 1,
      value: item.unitPrice,
      currency: "EUR",
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const payCart = async () => {
    if (!cart.length || payLoading) return;
    setPayLoading(true);
    setCartError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
            portraitUrl: item.portraitUrl,
            properties: item.properties,
            extras: item.extras,
          })),
        }),
      });
      const data = await res.json() as { checkoutUrl?: string; error?: string };
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? "Erreur commande.");
      // Pixel TikTok : départ vers le paiement Shopify (CompletePayment se déclenche sur Shopify)
      trackTikTok("InitiateCheckout", {
        value: cartTotal,
        currency: "EUR",
        contents: cart.map(item => ({
          content_id: item.productId,
          content_type: "product",
          content_name: item.label,
          price: item.unitPrice,
          quantity: 1,
        })),
      });
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setCartError(err instanceof Error ? err.message : "Erreur inconnue.");
      setPayLoading(false);
    }
  };

  // Réinitialise le tunnel pour un nouveau portrait — le panier est conservé.
  const restart = () => {
    setStep("upload");
    setPhotoFile(null);
    setIsExamplePhoto(false);
    setPetName("");
    setPhotoPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null; });
    setSelectedStyle(null);
    setJobId(null);
    setWatermarkedImageUrl(null);
    setOriginalImageUrl(null);
    setBlobImageUrl(null);
    setError(null);
    setCreditsRemaining(null);
    setGenerationAspectRatio("3:4");
    setPendingProduct(null);
  };

  const selectProduct = (productId: string) => {
    const product = SUPPORT_PRODUCTS.find(p => p.id === productId);
    if (!product || !product.available) return;
    if (product.offerLandscape && generationAspectRatio !== "16:9") {
      setPendingProduct(product.id);
    } else {
      setSelectedProduct(product.id);
      setStep("support");
    }
  };

  const STEP_LABELS = ["Photo", "Nom", "Cadeau", "Création", "Personnalisation"];
  const STEP_KEYS: Step[] = ["upload", "pet-name", "style", "generating", "support"];
  const currentStepIdx = STEP_KEYS.indexOf(step);

  return (
    <div className="mx-auto w-full max-w-6xl">

      {/* Header */}
      <div className="relative mb-8 flex items-center justify-between gap-3 sm:mb-10">
        <a
          href="https://compagnonsdecoeur.fr"
          className="flex shrink-0 items-center gap-1 text-sm font-semibold transition hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          ← Boutique
        </a>
        <a href="https://compagnonsdecoeur.fr" aria-label="Compagnons de Cœur — retour à la boutique" className="shrink-0 transition hover:opacity-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-compagnons-de-coeur.png" alt="Compagnons de Cœur" className="h-16 w-16 object-contain sm:h-20 sm:w-20" />
        </a>
        {step !== "upload" ? (
          <button
            type="button"
            onClick={restart}
            className="shrink-0 text-sm transition hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ↺ Recommencer
          </button>
        ) : <span className="w-14 shrink-0" aria-hidden />}
      </div>

      {/* Step indicator */}
      {step !== "support" && (
        <div className="mb-10 flex items-center justify-center gap-0">
          {STEP_LABELS.map((label, i) => {
            const done = i < currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={label} className="flex items-center">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                      done ? "text-white" : active ? "text-white" : "text-stone-400 bg-stone-200"
                    }`}
                    style={done || active ? { backgroundColor: "var(--green)" } : {}}
                  >
                    {done ? "✓" : i + 1}
                  </div>
                  <span className={`hidden text-xs sm:block ${active ? "text-stone-800 font-medium" : "text-stone-400"}`}>
                    {label}
                  </span>
                </div>
                {i < STEP_LABELS.length - 1 && (
                  <div
                    className="mx-2 mb-5 h-px w-7 transition-colors sm:mx-3 sm:w-12"
                    style={{ backgroundColor: done ? "var(--green)" : "var(--border)" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* ── ACCUEIL + UPLOAD ── */}
      {step === "upload" && (
        <div>
          <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-12">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[.18em]" style={{ color: "var(--green-dark)" }}>Portrait personnalisé · Créé en France</p>
              <h1 className="font-display mt-3 text-4xl font-bold leading-[.98] sm:text-6xl" style={{ color: "var(--ink)", letterSpacing: "-.025em" }}>
                Votre famille, transformée en <span style={{ color: "var(--orange)", fontStyle: "italic" }}>souvenir inoubliable.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: "var(--ink)" }}>
                Choisissez parmi 14 styles d&apos;artiste, découvrez votre aperçu gratuitement, puis imprimez votre portrait sur le cadeau de votre choix.
              </p>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-6 rounded-full px-7 py-4 text-base font-extrabold text-white transition hover:opacity-90 active:scale-[.99]" style={{ background: "#C9745A" }}>
                Créer notre portrait de famille →
              </button>
              <p className="mt-3 text-xs font-semibold" style={{ color: "var(--muted)" }}>Sans inscription pour le 1er aperçu · 5 aperçus offerts / jour · environ 30 s</p>
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-3xl p-3" style={{ background: "#FFF9F2", boxShadow: "0 20px 45px -24px rgba(90,70,50,.45)" }}>
              {["Votre photo", "Votre portrait"].map((label, index) => (
                <figure key={label} className={`overflow-hidden rounded-2xl border bg-white ${index ? "mt-8" : "mb-8"}`} style={{ borderColor: "var(--border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={FAMILY_PLACEHOLDER} alt={`${label} de famille — visuel à remplacer`} className="aspect-[3/4] w-full object-cover" />
                  <figcaption className="px-2 py-2 text-center text-xs font-extrabold" style={{ color: index ? "#C9745A" : "var(--muted)" }}>{label} · visuel à remplacer</figcaption>
                </figure>
              ))}
            </div>
          </section>

          <section className="mx-auto mt-14 max-w-2xl rounded-3xl border bg-white p-5 sm:p-7" style={{ borderColor: "var(--border)", boxShadow: "0 16px 45px -30px rgba(59,53,46,.55)" }}>
            <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--green-dark)" }}>Votre aperçu commence ici</p>
            <h2 className="font-display mt-1 text-2xl font-bold sm:text-3xl" style={{ color: "var(--ink)" }}>Ajoutez votre photo de famille</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>Une photo nette, bien éclairée, où chaque visage est visible.</p>
            <div role="button" tabIndex={0} onClick={() => fileInputRef.current?.click()} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }} onDragOver={e => { e.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={onDrop} className="mt-5 flex min-h-[250px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed p-4 text-center transition hover:bg-stone-50" style={{ borderColor: dragActive ? "var(--green)" : "var(--border)", background: dragActive ? "#EDF0E4" : "#FFFDF9" }}>
              {photoPreview ? <img src={photoPreview} alt="Aperçu de votre photo de famille" className="max-h-64 rounded-xl object-contain" /> : <><p className="mb-2 text-4xl" aria-hidden>📷</p><p className="font-bold" style={{ color: "var(--ink)" }}>Glissez votre photo ici, ou cliquez</p><p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>JPG ou PNG · 15 Mo max</p></>}
            </div>
            {photoFile && <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "#EDF0E4" }}><p className="min-w-0 truncate text-sm font-bold">{photoFile.name}</p><div className="ml-4 flex shrink-0 gap-3 text-sm"><button type="button" onClick={() => setShowCropModal(true)} className="font-bold" style={{ color: "var(--green-dark)" }}>Rogner</button><button type="button" onClick={() => fileInputRef.current?.click()} style={{ color: "var(--muted)" }}>Changer</button></div></div>}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            {isDemoMode && !photoFile && <button type="button" onClick={async () => { const res = await fetch("/logo-compagnons-de-coeur.png"); const blob = await res.blob(); handleFile(new File([blob], "exemple-famille-a-remplacer.png", { type: "image/png" })); setIsExamplePhoto(true); }} className="mt-4 w-full rounded-xl border py-3 text-sm font-bold" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>🛠️ Mode test — exemple sans génération facturée</button>}
            <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>Votre photo sert uniquement à créer l&apos;aperçu. En continuant, vous acceptez notre <a href="https://compagnonsdecoeur.fr/policies/privacy-policy" className="underline">politique de confidentialité</a>.</p>
            {photoFile && <button type="button" onClick={() => setStep("pet-name")} className="mt-5 w-full rounded-full py-3.5 text-base font-extrabold text-white" style={{ background: "#C9745A" }}>Continuer →</button>}
          </section>

          <section className="mt-14">
            <p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--green-dark)" }}>Un portrait, plusieurs cadeaux</p>
            <h2 className="font-display mt-1 text-2xl font-bold sm:text-3xl" style={{ color: "var(--ink)" }}>Choisissez le support qui réunira vos plus beaux souvenirs.</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">{PRODUCT_STRIP.map(p => <button key={p.label} type="button" onClick={() => fileInputRef.current?.click()} className="overflow-hidden rounded-2xl border bg-white text-left" style={{ borderColor: "var(--border)" }}><img src={FAMILY_PLACEHOLDER} alt={`${p.label} famille — visuel à remplacer`} className="aspect-[4/3] w-full object-cover" /><div className="px-4 py-3"><p className="font-extrabold">{p.label}</p><p className="text-sm font-bold" style={{ color: "#C9745A" }}>{p.price}</p></div></button>)}</div>
            <div className="mt-4 flex flex-wrap gap-2">{CATEGORY_CHIPS.map(c => <span key={c.label} className="rounded-full border bg-white px-3 py-2 text-xs font-bold" style={{ borderColor: "var(--border)" }}>{c.emoji} {c.label}</span>)}</div>
          </section>

          <section className="mt-14"><p className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: "var(--green-dark)" }}>Comment ça marche</p><h2 className="font-display mt-1 text-2xl font-bold sm:text-3xl">Trois étapes, zéro effort.</h2><div className="mt-5 grid gap-3 sm:grid-cols-3">{[
            ["1", "Ajoutez votre photo", "Une seule photo de famille suffit."], ["2", "Choisissez votre style", "14 univers artistiques et 5 aperçus gratuits par jour."], ["3", "Offrez votre portrait", "Tableau, t-shirt ou sweat, préparé avec soin en France."],
          ].map(([n,t,d]) => <div key={n} className="rounded-2xl border bg-white p-4" style={{ borderColor: "var(--border)" }}><span className="flex h-9 w-9 items-center justify-center rounded-full font-extrabold text-white" style={{ background: "var(--green)" }}>{n}</span><h3 className="mt-3 font-extrabold">{t}</h3><p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{d}</p></div>)}</div></section>

          <section className="mt-12 rounded-3xl border p-6 sm:p-8" style={{ borderColor: "#E8A87C", background: "#FFF3E8" }}><h2 className="font-display text-2xl font-bold">Toute votre famille, réunie dans un cadeau unique.</h2><p className="mt-2 max-w-3xl leading-relaxed" style={{ color: "var(--ink)" }}>Anniversaire, Noël, fête des mères ou des pères : transformez une photo importante en souvenir durable à offrir ou à garder.</p></section>
        </div>
      )}

      {/* Ancienne page conservée temporairement hors rendu, le temps de valider la nouvelle façade. */}
      {false && step === "upload" && (
        <div className="mx-auto max-w-xl">

          {/* Comment ça marche — transformation en vraies images (compact : le module d'upload reste visible sans scroll sur mobile) */}
          <div className="hidden mb-8 items-center justify-center gap-1.5 sm:gap-2.5">
            {[
              { src: "/how-it-works/1-photo.jpg", label: "Votre photo", alt: "Photo réelle d'une famille" },
              { src: "/how-it-works/2-portrait.jpg", label: "On crée le portrait", alt: "Portrait aquarelle de la même famille" },
              { src: "/how-it-works/3-tshirt.jpg", label: "Sur votre t-shirt… et bien d'autres", alt: "Le portrait imprimé sur un t-shirt, un sweat, un tableau et bien d'autres produits" },
            ].map((s, i) => (
              <div key={s.src} className="flex min-w-0 items-center gap-1.5 sm:gap-2.5">
                {i > 0 && (
                  <span className="shrink-0 text-base sm:text-xl" style={{ color: "var(--green)" }} aria-hidden>
                    →
                  </span>
                )}
                <figure className="min-w-0 flex-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.src}
                    alt={s.alt}
                    width={480}
                    height={480}
                    className="aspect-square w-full rounded-xl border object-cover shadow-sm"
                    style={{ borderColor: "var(--border)" }}
                  />
                  <figcaption className="mt-1.5 text-center text-[11px] font-medium text-stone-700 sm:text-xs">
                    {s.label}
                  </figcaption>
                </figure>
              </div>
            ))}
          </div>

          <div className="mb-7 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-stone-700">
            <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>1 · Photo</div>
            <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>2 · Style</div>
            <div className="rounded-xl border bg-white p-3" style={{ borderColor: "var(--border)" }}>3 · Cadeau</div>
          </div>
          <h2 className="font-display mb-1 text-2xl text-stone-800">Photo de votre famille</h2>
          <p className="mb-6 text-sm" style={{ color: "var(--muted)" }}>
            JPG ou PNG, 15 Mo max. Une belle photo de famille pour un résultat optimal.
          </p>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            onDragOver={e => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            className={`flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition-all ${
              dragActive ? "border-green-400 bg-green-50" : "hover:border-stone-400"
            }`}
            style={{ borderColor: dragActive ? undefined : "var(--border)", background: dragActive ? undefined : "#faf9f7" }}
          >
            {photoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoPreview ?? undefined} alt="Aperçu" className="max-h-64 rounded-xl object-contain" />
            ) : (
              <>
                <p className="text-4xl mb-3">🐾</p>
                <p className="font-medium text-stone-700">Glissez-déposez votre photo ici</p>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>ou cliquez pour parcourir</p>
              </>
            )}
          </div>

          {photoFile && (
            <div className="mt-3 flex items-center justify-between rounded-xl px-4 py-2.5" style={{ background: "var(--border)", opacity: 1, backgroundColor: "#f0ece7" }}>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-stone-700">{photoFile?.name}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{((photoFile?.size ?? 0) / 1024 / 1024).toFixed(2)} Mo</p>
              </div>
              <div className="ml-4 flex shrink-0 gap-3 text-sm">
                <button type="button" onClick={e => { e.stopPropagation(); setShowCropModal(true); }} className="font-medium transition hover:opacity-70" style={{ color: "var(--green)" }}>
                  Rogner
                </button>
                <span style={{ color: "var(--border)" }}>|</span>
                <button type="button" onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} className="transition hover:opacity-70" style={{ color: "var(--muted)" }}>
                  Changer
                </button>
              </div>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

          {!photoFile && (
            <>
              <div className="hidden my-5 items-center gap-3">
                <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--muted)" }}>OU</span>
                <div className="h-px flex-1" style={{ backgroundColor: "var(--border)" }} />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await fetch("/demos/exemple-pet.jpg");
                  const blob = await res.blob();
                  const file = new File([blob], "exemple-pet.jpg", { type: "image/jpeg" });
                  handleFile(file);
                  setIsExamplePhoto(true);
                }}
                className="hidden w-full rounded-xl border py-3 text-sm font-medium transition hover:bg-white"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                🐾 Essayer avec une photo d&apos;exemple
              </button>
            </>
          )}

          <p className="mt-3 text-center text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
            Votre photo est traitée pour créer l&apos;aperçu. En continuant, vous acceptez notre{" "}
            <a href="https://compagnonsdecoeur.fr/policies/privacy-policy" className="underline hover:opacity-70">politique de confidentialité</a>.
          </p>

          <button
            type="button"
            disabled={!photoFile}
            onClick={() => setStep("pet-name")}
            className="mt-6 w-full rounded-full py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ backgroundColor: "var(--green)" }}
          >
            Continuer →
          </button>

          {/* Galerie de preuve — SOUS le module d'upload (le module reste visible sans scroll sur mobile) */}
          <div className="hidden mt-12 border-t pt-8" style={{ borderColor: "var(--border)" }}>
            <h2 className="font-display mb-1 text-center text-2xl text-stone-800 sm:text-3xl">
              Ce que vous allez recevoir
            </h2>
            <p className="mb-5 text-center text-sm" style={{ color: "var(--muted)" }}>
              À partir d&apos;une simple photo de famille — aperçu gratuit en ~30 secondes
            </p>

            {/* Rangée produits : le portrait décliné sur les supports disponibles */}
            <div className="mb-6 grid grid-cols-3 gap-2.5">
              {[
                { src: "/products-row/tshirt.jpg", label: "T-shirt · dès 29,90 €", alt: "Portrait personnalisé imprimé sur un t-shirt en coton bio" },
                { src: "/products-row/sweat.jpg", label: "Sweat · 69,90 €", alt: "Portrait personnalisé imprimé au dos d'un sweat à capuche" },
                { src: "/products-row/tableau.jpg", label: "Tableau toile · dès 24,90 €", alt: "Portrait personnalisé sur tableau toile accroché dans un salon" },
              ].map(p => (
                <div key={p.src} className="overflow-hidden rounded-xl border bg-white" style={{ borderColor: "var(--border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.alt} loading="lazy" className="aspect-square w-full object-cover" />
                  <p className="px-1 py-1.5 text-center text-[11px] font-semibold text-stone-700">{p.label}</p>
                </div>
              ))}
            </div>

            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
              14 styles artistiques au choix
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              {GALLERY_EXAMPLES.map(g => (
                <div
                  key={g.src}
                  className="overflow-hidden rounded-xl border bg-white"
                  style={{ borderColor: "var(--border)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={g.src}
                    alt={`Portrait style ${g.label}`}
                    loading="lazy"
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <p className="px-1 py-1.5 text-center text-[11px]" style={{ color: "var(--muted)" }}>
                    {g.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── PET NAME ── */}
      {step === "pet-name" && (
        <div className="mx-auto max-w-md text-center">
          <p className="text-4xl mb-5">🐾</p>
          <h2 className="font-display text-3xl text-stone-900 mb-2">
            Le nom de votre famille ?
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
            Il pourra être inscrit sur le portrait. À l&apos;étape suivante, nous vous
            montrerons seulement les styles adaptés au cadeau choisi.
          </p>
          <div className="relative">
            <input
              type="text"
              maxLength={24}
              value={petName}
              onChange={e => setPetName(e.target.value)}
              placeholder="Ex : Famille Martin"
              className="w-full rounded-2xl border bg-white py-3.5 pl-4 pr-4 text-stone-800 outline-none transition focus:ring-2"
              style={{ borderColor: "var(--border)", outline: "none" }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs px-1" style={{ color: "var(--muted)" }}>
            <span>Optionnel</span>
            <span>{petName.length}/24</span>
          </div>
          <div className="mt-8 flex items-center justify-center gap-5">
            <button type="button" onClick={() => setStep("upload")} className="text-sm transition hover:opacity-70" style={{ color: "var(--muted)" }}>
              ← Retour
            </button>
            <button
              type="button"
              onClick={() => setStep("style")}
              className="rounded-full px-8 py-3 text-sm font-semibold text-white transition hover:opacity-90"
              style={{ backgroundColor: "var(--ink)" }}
            >
              {petName ? "Continuer →" : "Passer cette étape →"}
            </button>
          </div>
        </div>
      )}

      {/* ── CATALOGUE PRODUIT + STYLE ── */}
      {step === "style" && (
        <div>
          <div className="mb-7 flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-extrabold uppercase tracking-[.18em]" style={{ color: "#C9745A" }}>Votre cadeau prend forme</p>
              <h2 className="font-display text-3xl text-stone-900">Choisissez le rendu qui vous plaît</h2>
              <p className="mt-2 max-w-2xl text-sm" style={{ color: "var(--muted)" }}>Sélectionnez un produit : nous affichons uniquement les styles adaptés à ce support. Les visuels Famille définitifs seront ajoutés lors de la prochaine passe créative.</p>
            </div>
            <button type="button" onClick={() => setStep("pet-name")} className="shrink-0 text-sm transition hover:opacity-70" style={{ color: "var(--muted)" }}>
              ← Retour
            </button>
          </div>

          <div className="mb-7 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">
            {CATALOG_PRODUCTS.map(product => <button key={product.id} type="button" onClick={() => { setSelectedProduct(product.id); setSelectedStyle(null); }} className="min-w-[132px] shrink-0 rounded-2xl border px-4 py-3 text-left transition" style={selectedProduct === product.id ? { borderColor: "var(--green)", background: "#EDF0E4" } : { borderColor: "var(--border)", background: "white" }}><span className="text-xl">{product.emoji}</span><span className="mt-1 block text-sm font-extrabold">{product.label}</span><span className="text-[10px] font-bold" style={{ color: "var(--muted)" }}>{product.price}</span></button>)}
          </div>

          {(() => {
            const product = CATALOG_PRODUCTS.find(item => item.id === selectedProduct) ?? CATALOG_PRODUCTS[0];
            const styles = product.styleIds.map(id => STYLES.find(style => style.id === id)).filter((style): style is Style => Boolean(style));
            return <div><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-widest" style={{ color: "var(--muted)" }}>Nos recommandations pour</p><h3 className="font-display text-2xl">{product.label}</h3></div><span className="rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: "#FFF3E8" }}>{styles.length} rendus adaptés · {product.price}</span></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{styles.map(style => <button key={`${product.id}-${style.id}`} type="button" onClick={() => handleStyleSelect(style)} className="overflow-hidden rounded-2xl border bg-white text-left transition hover:-translate-y-1 hover:shadow-lg" style={{ borderColor: "var(--border)" }}><CatalogPreview product={product} style={style} /><div className="p-3.5"><div className="flex justify-between gap-2"><h4 className="text-sm font-extrabold">{style.nameFr}</h4><span className="text-xs" style={{ color: "#C9745A" }}>Choisir →</span></div><p className="mt-1 line-clamp-2 text-[11px]" style={{ color: "var(--muted)" }}>{style.description}</p></div></button>)}</div></div>;
          })()}

          {isSubmitting && (
            <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>Lancement de la génération…</p>
          )}
        </div>
      )}

      {/* ── MODAL CONFIRMATION DE STYLE ── */}
      {showStyleConfirm && selectedStyle && step === "style" && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowStyleConfirm(false)}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mx-auto mb-4 w-44 overflow-hidden rounded-xl shadow-md"><CatalogPreview product={CATALOG_PRODUCTS.find(item => item.id === selectedProduct) ?? CATALOG_PRODUCTS[0]} style={selectedStyle} /></div>
            <h3 className="text-center font-display text-2xl text-stone-900">{selectedStyle.nameFr}</h3>
            <p className="mt-1 text-center text-sm" style={{ color: "var(--muted)" }}>sur {CATALOG_PRODUCTS.find(item => item.id === selectedProduct)?.label} · {CATALOG_PRODUCTS.find(item => item.id === selectedProduct)?.price}</p>
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => { setShowStyleConfirm(false); void handleConfirmGeneration(); }}
              className="mt-5 w-full rounded-full py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "var(--green)" }}
            >
              Créer notre aperçu personnalisé →
            </button>
            <button
              type="button"
              onClick={() => setShowStyleConfirm(false)}
              className="mt-3 w-full text-center text-sm transition hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              Choisir un autre style
            </button>
          </div>
        </div>
      )}

      {/* ── GENERATING ── */}
      {step === "generating" && (
        <div className="mx-auto max-w-lg py-10 text-center">
          <h2 className="font-display mb-2 text-3xl text-stone-900">Création en cours…</h2>
          {selectedStyle && (
            <p className="mb-10 text-sm" style={{ color: "var(--muted)" }}>Style : {selectedStyle.nameFr}</p>
          )}
          <div className="mb-3 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-[3000ms] ease-out"
              style={{ width: `${progressPct}%`, backgroundColor: "var(--green)" }}
            />
          </div>
          <div className="flex justify-between text-xs mb-8" style={{ color: "var(--muted)" }}>
            <span>{progressPct}%</span>
            <span>~30 secondes</span>
          </div>
          <p className="text-stone-600 transition-all duration-500">{generationMessage}</p>
        </div>
      )}

      {/* ── RESULT ── */}
      {step === "result" && watermarkedImageUrl && (
        <div>
          <div className="mb-8">
            <h2 className="font-display text-3xl text-stone-900">Votre aperçu est prêt</h2>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              Aperçu filigrané — commandez pour recevoir la version HD sans filigrane.
            </p>
          </div>

          <div className="flex flex-col xl:flex-row gap-10 items-start">
            {/* Portrait */}
            <div className="xl:sticky xl:top-8 xl:w-64 shrink-0 mx-auto xl:mx-0 w-full max-w-xs">
              <div className="overflow-hidden rounded-2xl shadow-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={watermarkedImageUrl} alt="Portrait généré" className="w-full object-cover" />
              </div>
              <button type="button" onClick={() => setStep("style")} className="mt-3 w-full text-center text-sm font-medium transition hover:opacity-70" style={{ color: "var(--green)" }}>
                🎨 Essayer un autre style
              </button>
              <button type="button" onClick={restart} className="mt-2 w-full text-center text-sm transition hover:opacity-70" style={{ color: "var(--muted)" }}>
                ↺ Nouveau portrait
              </button>
              {creditsRemaining !== null && creditsRemaining > 0 && selectedStyle && (
                <p className="mt-2 text-center text-xs" style={{ color: "var(--muted)" }}>
                  {creditsRemaining} aperçu{creditsRemaining > 1 ? "s" : ""} restant{creditsRemaining > 1 ? "s" : ""} — {selectedStyle.nameFr}
                </p>
              )}

              {/* Historique des générations : revenir à un portrait précédent sans re-générer */}
              {history.length > 1 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    Vos générations
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {history.map(h => {
                      const isCurrent = h.originalImageUrl === originalImageUrl;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          title={h.styleName}
                          onClick={() => restoreFromHistory(h)}
                          className={`overflow-hidden rounded-lg transition ${isCurrent ? "ring-2 ring-offset-1" : "opacity-80 hover:opacity-100"}`}
                          style={isCurrent ? { outline: "2px solid var(--green)", outlineOffset: "1px" } : {}}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={h.watermarkedImageUrl}
                            alt={h.styleName}
                            className="aspect-[3/4] w-full object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1.5 text-center text-[11px]" style={{ color: "var(--muted)" }}>
                    Cliquez pour revenir à un portrait précédent
                  </p>
                </div>
              )}
            </div>

            {/* Produits par catégorie */}
            <div className="flex-1 min-w-0 space-y-8">
              <h3 className="font-display text-xl text-stone-800">Choisissez votre support</h3>

              {/* Bandeau produit présélectionné (lien depuis fiche Shopify) */}
              {preselectedProduct && (() => {
                const prod = SUPPORT_PRODUCTS.find(p => p.id === preselectedProduct);
                if (!prod || !prod.available) return null;
                return (
                  <div className="flex flex-wrap items-center gap-4 rounded-2xl border p-4" style={{ borderColor: "var(--green)", backgroundColor: "#f3f8f4" }}>
                    <div className="text-3xl">{prod.emoji}</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-stone-800">Vous étiez venu pour le {prod.label}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>Continuez avec ce support, ou choisissez-en un autre ci-dessous.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectProduct(prod.id)}
                      className="shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: "var(--green)" }}
                    >
                      Continuer avec le {prod.label} →
                    </button>
                  </div>
                );
              })()}
              {displayCategories.map(category => ({ ...category, products: category.products.filter(product => product.available) }))
                .filter(category => category.products.length > 0).map(category => (
                <div key={category.id}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    {category.label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {category.products.map(product => {
                      const isPreselected = product.id === preselectedProduct;
                      return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => selectProduct(product.id)}
                        className="relative cursor-pointer rounded-xl border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                        style={
                          isPreselected
                            ? { borderColor: "var(--green)", backgroundColor: "var(--green)", boxShadow: "0 4px 16px rgba(74,124,89,.35)" }
                            : { borderColor: "var(--border)", backgroundColor: "white" }
                        }
                      >
                        {isPreselected && (
                          <span className="absolute -top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "white", color: "var(--green)" }}>
                            ✨ Votre choix
                          </span>
                        )}
                        <div className="text-2xl mb-2">{product.emoji}</div>
                        <p className={`text-sm font-semibold ${isPreselected ? "text-white" : "text-stone-800"}`}>{product.label}</p>
                      </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <p className="rounded-xl border px-4 py-3 text-center text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
                Les supports affichés ci-dessus sont commandables immédiatement.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL FORMAT PAYSAGE ── */}
      {pendingProduct && (() => {
        const prod = SUPPORT_PRODUCTS.find(p => p.id === pendingProduct)!;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
              <h3 className="font-display text-xl text-stone-900 mb-2">Format paysage ?</h3>
              <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
                Votre portrait est en format portrait (3:4). Si vous prévoyez d&apos;afficher votre <strong>{prod.label}</strong> en mode paysage, nous pouvons régénérer en 16:9 — gratuitement.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={async () => {
                    if (!selectedStyle) return;
                    setSelectedProduct(pendingProduct);
                    setPendingProduct(null);
                    await startGeneration(selectedStyle, undefined, "16:9", true);
                  }}
                  className="w-full rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "var(--green)" }}
                >
                  Régénérer en paysage (16:9) →
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProduct(pendingProduct);
                    setPendingProduct(null);
                    setStep("support");
                  }}
                  className="w-full rounded-full border py-3 text-sm transition hover:bg-stone-50"
                  style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                >
                  Utiliser tel quel (3:4)
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── EMAIL MODAL ── */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            <h3 className="font-display text-2xl text-stone-900">Votre email pour continuer</h3>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Pour votre première génération de ce style, indiquez votre email afin de vous envoyer votre portrait.
            </p>
            <form onSubmit={handleEmailSubmit} className="mt-6 space-y-4">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                className="w-full rounded-xl border bg-stone-50 px-4 py-3 outline-none transition focus:ring-2"
                style={{ borderColor: "var(--border)" }}
                required
              />
              {emailError && <p className="text-sm text-red-600">{emailError}</p>}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowEmailModal(false)}
                  className="flex-1 rounded-full border py-3 text-sm text-stone-700 transition hover:bg-stone-50"
                  style={{ borderColor: "var(--border)" }}>
                  Annuler
                </button>
                <button type="submit" disabled={isSubmitting}
                  className="flex-1 rounded-full py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40"
                  style={{ backgroundColor: "var(--green)" }}>
                  {isSubmitting ? "Envoi…" : "Générer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SUPPORT ── */}
      {step === "support" && originalImageUrl && (
        <SupportSelector
          productId={selectedProduct}
          mockupImageUrl={blobImageUrl ?? originalImageUrl}
          shopifyImageUrl={originalImageUrl}
          petName={petName || undefined}
          demoMode={isDemoMode}
          inkInvertible={selectedStyle?.transparent === "ink"}
          onBack={() => setStep("style")}
          onAddToCart={addToCart}
        />
      )}

      {/* ── BADGE PANIER ── */}
      {cart.length > 0 && !showCartModal && (
        <button
          type="button"
          onClick={() => setShowCartModal(true)}
          className="fixed top-4 right-4 z-[70] flex items-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-semibold shadow-lg transition hover:shadow-xl"
          style={{ borderColor: "var(--border)", color: "var(--ink)" }}
        >
          🛒 Panier ({cart.length}) · {fmtPrice(cartTotal)}
        </button>
      )}

      {/* ── MODAL PANIER / « CRÉER UN AUTRE PORTRAIT ? » ── */}
      {showCartModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
            {cart.length > 0 ? (
              <>
                <h3 className="font-display text-2xl text-stone-900">Votre panier 🤍</h3>
                <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
                  Envie d&apos;un autre portrait ? Une autre photo, un autre style, un autre support — tout se paie en une seule fois.
                </p>

                <div className="mt-5 max-h-60 space-y-3 overflow-y-auto pr-1">
                  {cart.map(item => (
                    <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: "var(--border)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.previewUrl} alt={item.label} className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-800">{item.label}</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>{fmtPrice(item.unitPrice)}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Retirer du panier"
                        className="shrink-0 px-1 text-xl leading-none transition hover:opacity-60"
                        style={{ color: "var(--muted)" }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <span className="text-sm" style={{ color: "var(--muted)" }}>Total TTC · hors livraison</span>
                  <span className="text-xl font-bold text-stone-900">{fmtPrice(cartTotal)}</span>
                </div>

                {cartError && <p className="mt-3 text-sm text-red-600">{cartError}</p>}

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={payCart}
                    disabled={payLoading}
                    className="w-full rounded-full py-3.5 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    style={{ backgroundColor: "var(--green)" }}
                  >
                    {payLoading ? "Création de la commande…" : `Payer ${fmtPrice(cartTotal)} →`}
                  </button>
                  {originalImageUrl && (
                    <button
                      type="button"
                      onClick={() => { setShowCartModal(false); setStep("result"); }}
                      className="w-full rounded-full border py-3 text-sm font-medium transition hover:bg-stone-50"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      🛍️ Garder ce portrait, ajouter un autre produit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setShowCartModal(false); restart(); }}
                    className="w-full rounded-full border py-3 text-sm font-medium transition hover:bg-stone-50"
                    style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                  >
                    🎨 Créer un autre portrait
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCartModal(false)}
                    className="text-center text-sm transition hover:opacity-70"
                    style={{ color: "var(--muted)" }}
                  >
                    Fermer
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-display text-2xl text-stone-900">Votre panier est vide</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  Ajoutez un portrait sur le support de votre choix pour continuer.
                </p>
                <button
                  type="button"
                  onClick={() => setShowCartModal(false)}
                  className="mt-6 w-full rounded-full py-3.5 font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: "var(--green)" }}
                >
                  Continuer
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── CROP MODAL ── */}
      {showCropModal && photoPreview && (
        <CropModal
          imageSrc={photoPreview}
          onClose={() => setShowCropModal(false)}
          onCropDone={blob => {
            const croppedFile = new File([blob], photoFile?.name ?? "photo.jpg", { type: "image/jpeg" });
            handleFile(croppedFile);
            setShowCropModal(false);
          }}
        />
      )}
    </div>
  );
}
