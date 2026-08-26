import { useEffect, useState } from "react";

/**
 * Returns a CSS object-position string (e.g. "50% 22%") for a photo, attempting
 * to keep faces visible.
 *
 * Uses the native FaceDetector API when supported (Chromium, behind a flag in
 * some builds). Falls back to a sensible "center 25%" — most faces in user-
 * submitted kindness photos sit in the upper portion of the frame.
 *
 * `safeBottomFraction` (0..1) tells us how much of the bottom of the frame
 * is covered by other UI (text panel, footer chrome). We bias the crop so the
 * detected face avoids that band.
 */
export function useFaceAwareObjectPosition(
  src: string | null | undefined,
  safeBottomFraction = 0,
) {
  const fallback = `50% ${safeBottomFraction > 0.4 ? 25 : 30}%`;
  const [pos, setPos] = useState<string>(fallback);

  useEffect(() => {
    if (!src) {
      setPos(fallback);
      return;
    }

    let cancelled = false;
    setPos(fallback);

    const FD = (window as unknown as { FaceDetector?: new (opts?: unknown) => {
      detect: (img: HTMLImageElement) => Promise<Array<{ boundingBox: DOMRectReadOnly }>>;
    } }).FaceDetector;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";

    img.onload = async () => {
      if (cancelled) return;
      if (!FD) return; // keep fallback
      try {
        const detector = new FD({ fastMode: true, maxDetectedFaces: 5 });
        const faces = await detector.detect(img);
        if (cancelled || !faces || faces.length === 0) return;

        // Compute the centroid of all face boxes.
        let cx = 0;
        let cy = 0;
        for (const f of faces) {
          cx += f.boundingBox.x + f.boundingBox.width / 2;
          cy += f.boundingBox.y + f.boundingBox.height / 2;
        }
        cx /= faces.length;
        cy /= faces.length;

        const w = img.naturalWidth || 1;
        const h = img.naturalHeight || 1;
        let xPct = (cx / w) * 100;
        let yPct = (cy / h) * 100;

        // Bias upward so the face stays clear of the bottom UI band.
        const safeTopMaxPct = (1 - safeBottomFraction) * 100;
        // Keep face roughly in the upper 60% of the visible photo area.
        const targetMax = Math.max(20, safeTopMaxPct - 15);
        if (yPct > targetMax) yPct = targetMax;

        xPct = Math.max(0, Math.min(100, xPct));
        yPct = Math.max(0, Math.min(100, yPct));

        setPos(`${xPct.toFixed(1)}% ${yPct.toFixed(1)}%`);
      } catch {
        // Keep fallback on any error.
      }
    };
    img.src = src;

    return () => {
      cancelled = true;
    };
  }, [src, safeBottomFraction, fallback]);

  return pos;
}
