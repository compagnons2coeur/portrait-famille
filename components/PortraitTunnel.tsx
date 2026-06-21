"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { STYLES, type Style } from "@/lib/styles";
import { MAX_UPLOAD_BYTES, POLL_INTERVAL_MS } from "@/lib/constants";
import { applyWatermark, compressImage, isValidImageFile } from "@/lib/image-utils";
import SupportSelector from "@/components/SupportSelector";
import CropModal from "@/components/CropModal";

type Step = "upload" | "pet-name" | "style" | "generating" | "result" | "support";

const BLOCKED_MESSAGE =
  "Vous avez utilisé vos 2 aperçus gratuits pour ce style. Passez commande pour recevoir votre portrait en HD sans filigrane.";

const SUPPORT_CATEGORIES = [
  {
    id: "tableaux",
    label: "Tableaux",
    products: [
      { id: "tableau-toile", label: "Tableau Toile",      emoji: "🖼️", prix: "dès 34,90€", available: true,  offerLandscape: true  },
      { id: "tableau-metal", label: "Tableau Métal",      emoji: "✨",  prix: "dès 39,90€", available: true,  offerLandscape: true  },
    ],
  },
  {
    id: "textile",
    label: "Textile & Mode",
    products: [
      { id: "tshirt",    label: "T-shirt",   emoji: "👕", prix: "dès 24,90€", available: true,  offerLandscape: false },
      { id: "sweat",     label: "Sweat",     emoji: "🧥", prix: "dès 34,90€", available: true,  offerLandscape: false },
      { id: "polo",      label: "Polo",      emoji: "👔", prix: "dès 29,90€", available: true,  offerLandscape: false },
      { id: "tablier",   label: "Tablier",   emoji: "🍳", prix: "dès 27,90€", available: true,  offerLandscape: false },
      { id: "body-bebe", label: "Body bébé", emoji: "👶", prix: "dès 19,90€", available: true,  offerLandscape: false },
      { id: "pyjama",    label: "Pyjamas",   emoji: "😴", prix: "dès 34,90€", available: true,  offerLandscape: false },
      { id: "casquette", label: "Casquette", emoji: "🧢", prix: "Bientôt",    available: false, offerLandscape: false },
    ],
  },
  {
    id: "accessoires",
    label: "Accessoires",
    products: [
      { id: "tote-bag",  label: "Tote bag",           emoji: "👜", prix: "dès 18,90€", available: true,  offerLandscape: true  },
      { id: "coque",     label: "Coque téléphone",    emoji: "📱", prix: "dès 22,90€", available: true,  offerLandscape: false },
      { id: "porte-cle", label: "Porte-clé",          emoji: "🔑", prix: "dès 9,90€",  available: true,  offerLandscape: false },
      { id: "medaillon", label: "Médaillons/Colliers", emoji: "📿", prix: "dès 14,90€", available: true,  offerLandscape: false },
    ],
  },
  {
    id: "maison",
    label: "Maison & Déco",
    products: [
      { id: "mug",           label: "Mug",              emoji: "☕", prix: "dès 16,90€", available: true,  offerLandscape: true  },
      { id: "gourde",        label: "Gourde",           emoji: "🫙", prix: "dès 24,90€", available: true,  offerLandscape: false },
      { id: "tapis-souris",  label: "Tapis de souris",  emoji: "🖱️", prix: "dès 18,90€", available: true,  offerLandscape: true  },
      { id: "dessous-verre", label: "Dessous de verre", emoji: "🫗", prix: "dès 9,90€",  available: true,  offerLandscape: false },
      { id: "magnet",        label: "Magnet",           emoji: "🧲", prix: "dès 7,90€",  available: true,  offerLandscape: false },
      { id: "stickers",      label: "Stickers",         emoji: "🏷️", prix: "Bientôt",    available: false, offerLandscape: false },
    ],
  },
  {
    id: "cuisine",
    label: "Cuisine & Apéro",
    products: [
      { id: "planche-apero", label: "Planche apéro", emoji: "🧀", prix: "dès 29,90€", available: true, offerLandscape: true  },
      { id: "decapsuleur",   label: "Décapsuleur",   emoji: "🍺", prix: "dès 12,90€", available: true, offerLandscape: false },
    ],
  },
  {
    id: "papeterie",
    label: "Papeterie & Souvenirs",
    products: [
      { id: "marque-page", label: "Marque-page bois", emoji: "📖", prix: "dès 8,90€", available: true,  offerLandscape: true  },
      { id: "badge",       label: "Badge",             emoji: "🏅", prix: "dès 4,90€", available: true,  offerLandscape: false },
      { id: "puzzle",      label: "Puzzle",            emoji: "🧩", prix: "Bientôt",   available: false, offerLandscape: true  },
    ],
  },
];

const SUPPORT_PRODUCTS = SUPPORT_CATEGORIES.flatMap(c => c.products);

const PROGRESS_STEPS = [
  { pct: 8,  msg: "Analyse de votre animal en cours…" },
  { pct: 20, msg: "Identification des traits distinctifs…" },
  { pct: 35, msg: "Application du style artistique…" },
  { pct: 50, msg: "Ajout des détails et textures…" },
  { pct: 65, msg: "Mise en scène du portrait…" },
  { pct: 78, msg: "Finalisation des couleurs…" },
  { pct: 88, msg: "Dernières retouches…" },
  { pct: 94, msg: "Presque prêt…" },
];

function StyleCard({ style, selected, disabled, onSelect, previewOverride }: {
  style: Style; selected: boolean; disabled: boolean; onSelect: () => void; previewOverride?: string | null;
}) {
  const [imageError, setImageError] = useState(false);
  const imgSrc = previewOverride ?? `/styles/${style.id}.jpg`;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={`group overflow-hidden rounded-xl text-left transition-all duration-200 ${
        selected
          ? "ring-2 ring-offset-1 shadow-md"
          : "hover:shadow-sm hover:-translate-y-0.5"
      } disabled:opacity-50`}
      style={{ outline: selected ? `2px solid ${style.accent}` : undefined, outlineOffset: "2px" }}
    >
      <div className="aspect-[2/3] w-full overflow-hidden bg-stone-200 rounded-t-xl">
        {!imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={style.nameFr}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${style.id === "argentique" ? "object-top" : ""}`}
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-stone-100 px-3">
            <span className="text-center text-sm text-stone-500">{style.nameFr}</span>
          </div>
        )}
      </div>
      <div className="p-3" style={{ borderTop: `2px solid ${selected ? style.accent : "transparent"}` }}>
        <h3 className="text-xs font-semibold text-stone-800 leading-tight">{style.nameFr}</h3>
        <p className="mt-0.5 text-[11px] text-stone-400 leading-tight">{style.description}</p>
        <p className="mt-1.5 text-xs font-bold" style={{ color: "var(--green)" }}>Dès 34,90€</p>
      </div>
    </button>
  );
}

export default function PortraitTunnel() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
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

  useEffect(() => {
    let cancelled = false;
    FingerprintJS.load().then(fp => fp.get()).then(result => {
      if (!cancelled) setFingerprint(result.visitorId);
    }).catch(() => {
      if (!cancelled) setError("Impossible d'identifier cet appareil. Rechargez la page.");
    });
    return () => { cancelled = true; };
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
      setStep("generating");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStyleSelect = (style: Style) => { resetError(); setSelectedStyle(style); };

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
        setProgressPct(100);
        setGenerationMessage("Photo prête !");
        await new Promise(resolve => setTimeout(resolve, 400));
        setOriginalImageUrl(dataUrl);
        setWatermarkedImageUrl(watermarked);
        setBlobImageUrl(blobUrl);
        setStep("result");
      } catch {
        setError("Une erreur est survenue. Veuillez réessayer.");
        setStep("style");
      }
      return;
    }

    if (isExamplePhoto) {
      const demoUrl = `/demos/${selectedStyle.id}.jpg`;
      setStep("generating");
      await new Promise(resolve => setTimeout(resolve, 8000));
      setProgressPct(100);
      setGenerationMessage("Portrait prêt !");
      await new Promise(resolve => setTimeout(resolve, 500));
      setOriginalImageUrl(demoUrl);
      setWatermarkedImageUrl(demoUrl);
      setBlobImageUrl(demoUrl);
      setStep("result");
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
    const poll = async () => {
      try {
        const response = await fetch(`/api/status/${jobId}`);
        const data = (await response.json()) as { status: string; imageUrl?: string | null };
        if (cancelled) return;
        if (data.status === "completed" && data.imageUrl) {
          setProgressPct(100);
          setGenerationMessage("Application du filigrane…");
          try {
            const watermarked = await applyWatermark(data.imageUrl);
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
              setOriginalImageUrl(data.imageUrl);
              setWatermarkedImageUrl(watermarked);
              setBlobImageUrl(blobUrl);
              setStep("result");
            }
          } catch {
            if (!cancelled) {
              setOriginalImageUrl(data.imageUrl);
              setWatermarkedImageUrl(data.imageUrl);
              setBlobImageUrl(null);
              setStep("result");
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
  };

  const STEP_LABELS = ["Photo", "Style", "Création", "Résultat"];
  const STEP_KEYS: Step[] = ["upload", "style", "generating", "result"];
  const currentStepIdx = STEP_KEYS.indexOf(step);

  return (
    <div className="mx-auto w-full max-w-6xl">

      {/* Header */}
      <div className="mb-12 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: "var(--green)" }}>
          Compagnons de Cœur
        </p>
        <h1 className="font-display mt-3 text-4xl text-stone-900 sm:text-5xl" style={{ letterSpacing: "-0.02em" }}>
          Portrait de votre compagnon
        </h1>
        <p className="mt-3 text-base" style={{ color: "var(--muted)" }}>
          Uploadez une photo · Choisissez un style · Recevez un aperçu gratuit
        </p>
        {step !== "upload" && (
          <button
            type="button"
            onClick={restart}
            className="mt-5 text-sm transition hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ↺ Recommencer
          </button>
        )}
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
                {i < 3 && (
                  <div
                    className="mx-3 mb-5 h-px w-10 sm:w-16 transition-colors"
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

      {/* ── UPLOAD ── */}
      {step === "upload" && (
        <div className="mx-auto max-w-xl">
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
              <img src={photoPreview} alt="Aperçu" className="max-h-64 rounded-xl object-contain" />
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
                <p className="truncate text-sm font-medium text-stone-700">{photoFile.name}</p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{(photoFile.size / 1024 / 1024).toFixed(2)} Mo</p>
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
              <div className="my-5 flex items-center gap-3">
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
                className="w-full rounded-xl border py-3 text-sm font-medium transition hover:bg-white"
                style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              >
                🐾 Essayer avec une photo d&apos;exemple
              </button>
            </>
          )}

          <button
            type="button"
            disabled={!photoFile}
            onClick={() => setStep("pet-name")}
            className="mt-6 w-full rounded-full py-3.5 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
            style={{ backgroundColor: "var(--green)" }}
          >
            Continuer →
          </button>
        </div>
      )}

      {/* ── PET NAME ── */}
      {step === "pet-name" && (
        <div className="mx-auto max-w-md text-center">
          <p className="text-4xl mb-5">🐾</p>
          <h2 className="font-display text-3xl text-stone-900 mb-2">
            Comment s&apos;appelle votre compagnon ?
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
            Pour personnaliser votre tableau avec le nom de votre famille.
          </p>
          <div className="relative">
            <input
              type="text"
              maxLength={24}
              value={petName}
              onChange={e => setPetName(e.target.value)}
              placeholder="Ex : Famille Martin, ou Les Dupont"
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

      {/* ── STYLE ── */}
      {step === "style" && (
        <div>
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl text-stone-900">Choisissez un style</h2>
              <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>2 aperçus gratuits par style et par appareil.</p>
            </div>
            <button type="button" onClick={() => setStep("upload")} className="shrink-0 text-sm transition hover:opacity-70" style={{ color: "var(--muted)" }}>
              Modifier la photo
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STYLES.map(style => (
              <StyleCard
                key={style.id}
                style={style}
                selected={selectedStyle?.id === style.id}
                disabled={isSubmitting}
                onSelect={() => handleStyleSelect(style)}
                previewOverride={style.id === "sans-ia" ? photoPreview : null}
              />
            ))}
          </div>

          {selectedStyle && !isSubmitting && (
            <div className="mt-8 rounded-2xl p-5 text-center" style={{ backgroundColor: "var(--green-light)" }}>
              <p className="mb-3 text-sm text-stone-700">
                Style sélectionné : <span className="font-semibold">{selectedStyle.nameFr}</span>
              </p>
              <button
                type="button"
                onClick={handleConfirmGeneration}
                className="rounded-full px-8 py-3 font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: "var(--green)" }}
              >
                Générer ce portrait →
              </button>
            </div>
          )}
          {isSubmitting && (
            <p className="mt-6 text-center text-sm" style={{ color: "var(--muted)" }}>Lancement de la génération…</p>
          )}
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
              <button type="button" onClick={restart} className="mt-3 w-full text-center text-sm transition hover:opacity-70" style={{ color: "var(--muted)" }}>
                ↺ Nouveau portrait
              </button>
              {creditsRemaining !== null && creditsRemaining > 0 && selectedStyle && (
                <p className="mt-2 text-center text-xs" style={{ color: "var(--muted)" }}>
                  {creditsRemaining} aperçu{creditsRemaining > 1 ? "s" : ""} restant{creditsRemaining > 1 ? "s" : ""} — {selectedStyle.nameFr}
                </p>
              )}
            </div>

            {/* Produits par catégorie */}
            <div className="flex-1 min-w-0 space-y-8">
              <h3 className="font-display text-xl text-stone-800">Choisissez votre support</h3>
              {SUPPORT_CATEGORIES.map(category => (
                <div key={category.id}>
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
                    {category.label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {category.products.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        disabled={!product.available}
                        onClick={() => {
                          if (!product.available) return;
                          if (product.offerLandscape && generationAspectRatio !== "16:9") {
                            setPendingProduct(product.id);
                          } else {
                            setSelectedProduct(product.id);
                            setStep("support");
                          }
                        }}
                        className={`rounded-xl border p-4 text-left transition-all duration-200 ${
                          product.available
                            ? "bg-white hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
                            : "cursor-not-allowed opacity-50"
                        }`}
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="text-2xl mb-2">{product.emoji}</div>
                        <p className="text-sm font-semibold text-stone-800">{product.label}</p>
                        {product.available ? (
                          <p className="mt-1 text-xs font-bold" style={{ color: "var(--green)" }}>{product.prix}</p>
                        ) : (
                          <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--border)", color: "var(--muted)" }}>
                            Bientôt
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Banner optimisation format */}
              {pendingProduct && (() => {
                const prod = SUPPORT_PRODUCTS.find(p => p.id === pendingProduct)!;
                return (
                  <div className="mt-5 rounded-2xl border p-4" style={{ borderColor: "var(--orange)", backgroundColor: "#fff9f5" }}>
                    <p className="text-sm font-semibold text-stone-800 mb-1">
                      Souhaitez-vous un format paysage ?
                    </p>
                    <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
                      Votre portrait est généré en format portrait (3:4). Si vous prévoyez d&apos;afficher votre {prod.label} en mode paysage, nous pouvons régénérer en 16:9 — gratuitement.
                    </p>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (!selectedStyle) return;
                          setSelectedProduct(pendingProduct);
                          setPendingProduct(null);
                          await startGeneration(selectedStyle, undefined, "16:9", true);
                        }}
                        className="rounded-full px-5 py-2 text-sm font-semibold text-white transition hover:opacity-90"
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
                        className="rounded-full border px-5 py-2 text-sm transition hover:bg-white"
                        style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                      >
                        Utiliser tel quel
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

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
          onBack={() => setStep("result")}
        />
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
