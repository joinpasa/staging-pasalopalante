import { RefObject, useEffect } from "react";

/**
 * Shrinks a text element's font-size until it fits inside its container
 * (no vertical overflow). Re-runs on container resize and when `deps` change.
 *
 * - `containerRef`: the box the text must fit inside
 * - `textRef`: the element whose fontSize will be reduced
 * - `maxPx` / `minPx`: bounds for font size (px)
 */
export function useAutoFitText<C extends HTMLElement, T extends HTMLElement>(
  containerRef: RefObject<C>,
  textRef: RefObject<T>,
  maxPx: number,
  minPx: number,
  deps: unknown[] = [],
  lineHeight: number = 1.15,
) {
  useEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    let raf = 0;
    const fit = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Reset and shrink down until it fits.
        let size = maxPx;
        text.style.fontSize = `${size}px`;
        text.style.lineHeight = String(lineHeight);
        // Also clamp letter spacing implicitly via px sizing.
        // Use a generous safety margin (1px) to avoid sub-pixel overflow.
        const fits = () =>
          text.scrollHeight <= container.clientHeight - 1 &&
          text.scrollWidth <= container.clientWidth - 1;

        // Quick coarse step, then fine.
        while (!fits() && size > minPx) {
          size -= size > 32 ? 2 : 1;
          text.style.fontSize = `${size}px`;
        }
      });
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(container);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
