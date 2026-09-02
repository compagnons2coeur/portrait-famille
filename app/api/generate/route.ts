import { NextRequest, NextResponse } from "next/server";
import {
  canGenerate,
  allowOptimization,
  consumeOptimization,
  incrementUsage,
  recordEmail,
} from "@/lib/credits";
import { fal, FAL_MODEL_ID } from "@/lib/fal";
import { buildPrompt, getStyleById } from "@/lib/styles";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);
const ALLOWED_ASPECT_RATIOS = new Set(["3:4", "16:9"]);

export async function POST(request: NextRequest) {
  try {
    if (!process.env.FAL_KEY) {
      return NextResponse.json(
        { error: "Configuration serveur manquante (FAL_KEY)." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const photo = formData.get("photo");
    const styleId = formData.get("styleId");
    const fingerprint = formData.get("fingerprint");
    const email = formData.get("email");
    const petName = formData.get("petName");
    const aspectRatio = typeof formData.get("aspectRatio") === "string" ? formData.get("aspectRatio") as string : "3:4";
    const isOptimization = formData.get("optimize") === "true";
    const sourceJobId = formData.get("sourceJobId");

    if (!(photo instanceof File)) {
      return NextResponse.json(
        { error: "Photo requise." },
        { status: 400 }
      );
    }
    if (photo.size > MAX_UPLOAD_BYTES || !ALLOWED_IMAGE_TYPES.has(photo.type)) {
      return NextResponse.json({ error: "Photo invalide ou trop volumineuse." }, { status: 400 });
    }

    if (typeof styleId !== "string" || typeof fingerprint !== "string") {
      return NextResponse.json(
        { error: "styleId et fingerprint sont requis." },
        { status: 400 }
      );
    }
    if (!fingerprint.trim() || fingerprint.length > 200 || !ALLOWED_ASPECT_RATIOS.has(aspectRatio)) {
      return NextResponse.json({ error: "Paramètres de génération invalides." }, { status: 400 });
    }
    if (typeof petName === "string" && petName.trim().length > 24) {
      return NextResponse.json({ error: "La personnalisation est trop longue." }, { status: 400 });
    }

    const style = getStyleById(styleId);
    if (!style) {
      return NextResponse.json({ error: "Style inconnu." }, { status: 400 });
    }

    if (isOptimization) {
      if (typeof sourceJobId !== "string" || !(await consumeOptimization(fingerprint, sourceJobId))) {
        return NextResponse.json({ error: "Régénération non autorisée." }, { status: 403 });
      }
    } else {
      const access = await canGenerate(fingerprint);

      if (!access.allowed) {
        return NextResponse.json(
          {
            error:
              "Vous avez utilisé vos 5 générations gratuites du jour. Revenez demain ou passez commande pour recevoir votre portrait en HD sans filigrane.",
          },
          { status: 403 }
        );
      }

      if (access.needsEmail) {
        if (typeof email !== "string" || email.length > 254 || !EMAIL_REGEX.test(email.trim())) {
          return NextResponse.json(
            { error: "Un email valide est requis pour votre première génération." },
            { status: 400 }
          );
        }
        await recordEmail(fingerprint, email);
      }
    }

    const uploadedUrl = await fal.storage.upload(photo);
    const basePrompt = buildPrompt(styleId);
    const nameContext =
      typeof petName === "string" && petName.trim() && style.nameTemplate
        ? " " + style.nameTemplate.replace("{name}", petName.trim())
        : "";
    const prompt = basePrompt + nameContext;

    const { request_id } = await fal.queue.submit(FAL_MODEL_ID, {
      input: {
        prompt,
        image_urls: [uploadedUrl],
        num_images: 1,
        output_format: "jpeg",
        resolution: "2K",
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        aspect_ratio: aspectRatio as any,
      },
    });

    if (!isOptimization) {
      await incrementUsage(fingerprint);
      await allowOptimization(fingerprint, request_id);
    }

    return NextResponse.json({ jobId: request_id });
  } catch (error) {
    console.error("[POST /api/generate]", error);
    return NextResponse.json(
      { error: "Erreur lors du lancement de la génération." },
      { status: 500 }
    );
  }
}
