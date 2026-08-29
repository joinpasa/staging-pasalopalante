"use client";

import { useEffect, useRef } from "react";

interface RippleCanvasProps {
  /** Spacing between dots in px (larger = calmer, sparser pond) */
  spacing?: number;
  /** How fast the ripple ring expands per frame (px) */
  rippleSpeed?: number;
  /** Max dot radius when "lifted" by a ripple */
  maxRadius?: number;
  /** Thickness of the ripple ring */
  rippleWidth?: number;
  /** Average ms between automatic ripples */
  autoRippleInterval?: number;
  className?: string;
}

interface Ripple {
  x: number;
  y: number;
  distance: number;
  life: number; // 0..1 fade
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function RippleCanvas({
  spacing = 28,
  rippleSpeed = 1.4,
  maxRadius = 3.4,
  rippleWidth = 26,
  autoRippleInterval = 3200,
  className = "",
}: RippleCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = prefersReducedMotion();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const sizeCanvas = () => {
      const { clientWidth, clientHeight } = canvas;
      canvas.width = Math.floor(clientWidth * dpr);
      canvas.height = Math.floor(clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const handleResize = () => sizeCanvas();
    sizeCanvas();
    window.addEventListener("resize", handleResize);

    const addRipple = (x: number, y: number) => {
      // Cap concurrent ripples for calmness
      if (ripplesRef.current.length > 6) ripplesRef.current.shift();
      ripplesRef.current.push({ x, y, distance: 0, life: 1 });
    };

    // Brand palette — aqua/cyan to match footer
    const BASE_DOT = "rgba(165, 233, 232, 0.16)"; // resting dots, soft
    const LIFT_DOT = "rgba(207, 250, 254, 0.55)"; // dots inside a ripple ring

    const render = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      ctx.clearRect(0, 0, w, h);

      // Advance & fade ripples
      const ripples = ripplesRef.current;
      for (let i = 0; i < ripples.length; i++) {
        ripples[i].distance += rippleSpeed;
        // Fade based on distance traveled (gentle, long tail)
        const maxReach = Math.hypot(w, h) * 0.55;
        ripples[i].life = Math.max(0, 1 - ripples[i].distance / maxReach);
      }
      ripplesRef.current = ripples.filter((r) => r.life > 0.02);

      // Draw dot grid
      const cols = Math.ceil(w / spacing) + 1;
      const rows = Math.ceil(h / spacing) + 1;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * spacing;
          const py = y * spacing;

          let radius = 1.1;
          let lift = 0;

          for (let j = 0; j < ripplesRef.current.length; j++) {
            const r = ripplesRef.current[j];
            const dx = r.x - px;
            const dy = r.y - py;
            const d = Math.sqrt(dx * dx + dy * dy);
            const delta = Math.abs(d - r.distance);
            if (delta < rippleWidth) {
              // Smooth ring profile
              const intensity = (1 - delta / rippleWidth) * r.life;
              lift = Math.max(lift, intensity);
              radius = Math.min(maxRadius, 1.1 + intensity * (maxRadius - 1.1));
            }
          }

          ctx.beginPath();
          ctx.fillStyle = lift > 0.05 ? LIFT_DOT : BASE_DOT;
          ctx.globalAlpha = lift > 0.05 ? 0.4 + lift * 0.6 : 1;
          ctx.arc(px, py, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    };

    const loop = () => {
      render();
      rafRef.current = requestAnimationFrame(loop);
    };

    if (reduced) {
      // Single static frame — no motion
      render();
    } else {
      rafRef.current = requestAnimationFrame(loop);

      const scheduleNext = () => {
        // Random interval around the configured average for organic rhythm
        const jitter = 0.6 + Math.random() * 0.9; // 0.6x..1.5x
        timerRef.current = setTimeout(() => {
          const w = canvas.clientWidth;
          const h = canvas.clientHeight;
          // Random position, biased toward center
          const cx = w * (0.2 + Math.random() * 0.6);
          const cy = h * (0.2 + Math.random() * 0.6);
          addRipple(cx, cy);
          scheduleNext();
        }, autoRippleInterval * jitter);
      };
      // Seed a first ripple shortly after mount
      timerRef.current = setTimeout(() => {
        addRipple(canvas.clientWidth * 0.5, canvas.clientHeight * 0.5);
        scheduleNext();
      }, 600);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [spacing, rippleSpeed, maxRadius, rippleWidth, autoRippleInterval]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 w-full h-full pointer-events-none ${className}`}
    />
  );
}

export default RippleCanvas;
