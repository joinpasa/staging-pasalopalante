import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface FlowFieldBackgroundProps {
  className?: string;
  /** Base canvas color (deep navy by default) */
  baseColor?: string;
  /** RGB tuple for primary particle color */
  particleRgb?: [number, number, number];
  /** RGB tuple for the rare accent particle color */
  accentRgb?: [number, number, number];
  particleCount?: number;
  /** Speed multiplier; default 0.5 = calm */
  speed?: number;
  /** 0..1 — lower = longer trails */
  trailOpacity?: number;
}

export default function FlowFieldBackground({
  className,
  baseColor = "#0A1530",
  particleRgb = [140, 170, 220],
  accentRgb = [120, 200, 230],
  particleCount = 220,
  speed = 0.5,
  trailOpacity = 0.06,
}: FlowFieldBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = container.clientWidth;
    let height = container.clientHeight;
    const dprMax = 1.5;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const mouse = { x: -10000, y: -10000 };
    let animationFrameId = 0;

    interface P {
      x: number;
      y: number;
      vx: number;
      vy: number;
      age: number;
      life: number;
      accent: boolean;
    }
    let particles: P[] = [];

    const makeParticle = (): P => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0,
      vy: 0,
      age: Math.random() * 200,
      life: Math.random() * 260 + 180,
      accent: Math.random() < 0.1,
    });

    const setupCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, dprMax);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
    };

    const paintBase = () => {
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, width, height);
    };

    const init = () => {
      setupCanvas();
      paintBase();
      particles = [];
      const count = prefersReduced ? 80 : particleCount;
      for (let i = 0; i < count; i++) particles.push(makeParticle());
    };

    const drawStatic = () => {
      paintBase();
      particles.forEach((p) => {
        const [r, g, b] = p.accent ? accentRgb : particleRgb;
        ctx.fillStyle = `rgba(${r},${g},${b},0.35)`;
        ctx.fillRect(p.x, p.y, 1.2, 1.2);
      });
    };

    const step = () => {
      // Trail fade using navy so trails dissolve into the base color
      ctx.fillStyle = `rgba(10,21,48,${trailOpacity})`;
      ctx.fillRect(0, 0, width, height);

      const interactionRadius = 260;
      const interactionRadiusSq = interactionRadius * interactionRadius;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const angle =
          (Math.cos(p.x * 0.004) + Math.sin(p.y * 0.004)) * Math.PI;
        p.vx += Math.cos(angle) * 0.1 * speed;
        p.vy += Math.sin(angle) * 0.1 * speed;

        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < interactionRadiusSq) {
          const dist = Math.sqrt(distSq) || 1;
          const force = (interactionRadius - dist) / interactionRadius;
          p.vx -= (dx / dist) * force * 1.2 * 0.012 * interactionRadius;
          p.vy -= (dy / dist) * force * 1.2 * 0.012 * interactionRadius;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.94;
        p.vy *= 0.94;

        p.age++;
        if (p.age > p.life) {
          p.x = Math.random() * width;
          p.y = Math.random() * height;
          p.vx = 0;
          p.vy = 0;
          p.age = 0;
          p.life = Math.random() * 260 + 180;
        }

        if (p.x < 0) p.x = width;
        else if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        else if (p.y > height) p.y = 0;

        const alpha = 1 - Math.abs(p.age / p.life - 0.5) * 2;
        const [r, g, b] = p.accent ? accentRgb : particleRgb;
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha * (p.accent ? 0.6 : 0.45)})`;
        ctx.fillRect(p.x, p.y, 1.2, 1.2);
      }

      animationFrameId = requestAnimationFrame(step);
    };

    const handleResize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      init();
      if (prefersReduced) drawStatic();
    };

    const handleMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };
    const handleLeave = () => {
      mouse.x = -10000;
      mouse.y = -10000;
    };

    init();
    if (prefersReduced) {
      drawStatic();
    } else {
      ctx.shadowBlur = 4;
      ctx.shadowColor = `rgba(${particleRgb[0]},${particleRgb[1]},${particleRgb[2]},0.6)`;
      step();
    }

    window.addEventListener("resize", handleResize);
    container.addEventListener("mousemove", handleMove);
    container.addEventListener("mouseleave", handleLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      container.removeEventListener("mousemove", handleMove);
      container.removeEventListener("mouseleave", handleLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [baseColor, particleRgb, accentRgb, particleCount, speed, trailOpacity]);

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 overflow-hidden", className)}
      style={{ backgroundColor: baseColor }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block w-full h-full" />
      <div className="absolute inset-0 pointer-events-none bg-grain" />
    </div>
  );
}
