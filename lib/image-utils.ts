import { MAX_IMAGE_DIMENSION, WATERMARK_TEXT } from "./constants";

export async function compressImage(
  file: File,
  maxDimension = MAX_IMAGE_DIMENSION
): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Impossible de préparer le canvas.");
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Échec de la compression de l'image."));
          return;
        }
        resolve(blob);
      },
      mimeType,
      0.9
    );
  });
}

export async function applyWatermark(
  imageUrl: string,
  text = WATERMARK_TEXT,
  format: "image/jpeg" | "image/png" = "image/jpeg"
): Promise<string> {
  const image = await loadImage(imageUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Impossible de préparer le canvas.");
  }

  ctx.drawImage(image, 0, 0);

  const fontSize = Math.max(20, Math.round(canvas.width * 0.04));
  ctx.font = `600 ${fontSize}px Georgia, serif`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.30)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.20)";
  ctx.lineWidth = 1.5;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const cols = 3;
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (canvas.width / cols) * (c + 0.5);
      const y = (canvas.height / rows) * (r + 0.5);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);
      ctx.strokeText(text, 0, 0);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  // PNG pour préserver la transparence (styles détourés), JPEG sinon.
  return format === "image/png"
    ? canvas.toDataURL("image/png")
    : canvas.toDataURL("image/jpeg", 0.92);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Impossible de charger l'image."));
    image.src = src;
  });
}

export function isValidImageFile(file: File): boolean {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg"];
  return allowedTypes.includes(file.type);
}
