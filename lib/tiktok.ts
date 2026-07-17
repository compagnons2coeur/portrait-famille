/** Helper pixel TikTok — sûr côté serveur (ne fait rien si ttq absent). */

type TtqParams = Record<string, unknown>;

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: TtqParams) => void;
      page: () => void;
      load: (id: string) => void;
    };
  }
}

/** Déclenche un event standard TikTok si le pixel est chargé. */
export function trackTikTok(event: string, params?: TtqParams): void {
  if (typeof window === "undefined") return;
  try {
    window.ttq?.track(event, params);
  } catch {
    /* pixel indisponible → on ignore silencieusement */
  }
}
