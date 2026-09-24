import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Camera, Download, Share2, HelpCircle, ChevronDown, Info, Apple, Smartphone } from "lucide-react";
import PassQrCode, { type PassQrCodeHandle } from "@/components/app/PassQrCode";
import JoinGate from "@/components/app/JoinGate";
import { useAuth } from "@shared/contexts/AuthContext";
import { useAppMe } from "@/hooks/useAppData";
import { getCanonicalOrigin } from "@shared/lib/canonicalOrigin";
import { cn } from "@shared/lib/utils";

type PassTab = "code" | "scan";

const memberSinceFormatter = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" });

export default function AppPass() {
  const [tab, setTab] = useState<PassTab>("code");
  const { user } = useAuth();
  const { data: me } = useAppMe();
  const navigate = useNavigate();

  // Your invite code comes from your profile, so the chain it builds is
  // real. Keep the actual value exactly as stored (lowercase hex) — both
  // log_pass_handoff and claim_referral match it case-sensitively, so
  // anything that mutates the case here breaks every scan/redemption of
  // this code. Uppercase is purely a CSS treatment on the display text.
  const code = me?.referralCode ?? "";
  // getCanonicalOrigin() + BASE_URL resolves to same-origin "pasalopalante.com/app/"
  // on the combined deployment, or the standalone app's own domain otherwise —
  // never the retired app.pasalopalante.com subdomain this used to hardcode,
  // which is now dead (522) and was silently baked into every printed/shared
  // pass code until this fixed it at the source.
  const appUrl = `${getCanonicalOrigin()}${import.meta.env.BASE_URL}`;
  const passUrl = code ? `${appUrl}?ref=${code}` : appUrl;

  return (
    <div className="flex flex-1 flex-col bg-app-canvas">
      <div className="flex h-16 shrink-0 items-center gap-1.5 border-b border-border bg-app-surface px-2">
        <button
          type="button"
          onClick={() => navigate("/")}
          aria-label="Back to dashboard"
          className="flex h-10 w-10 items-center justify-center rounded-xl"
        >
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <p className="text-[15.5px] font-bold text-foreground">Share or Scan</p>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-6 py-5">
        <div className="flex rounded-full bg-app-ink/[0.06] p-1" role="tablist" aria-label="Pass mode">
          {(
            [
              { id: "code", label: "My Code" },
              { id: "scan", label: "Scan" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "flex-1 rounded-full py-2.5 text-sm font-bold transition-colors",
                tab === id ? "bg-app-coral text-app-surface" : "text-app-ink/55",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "code" ? (
          !user ? (
            <div className="flex flex-col gap-3 pt-2 text-center">
              <h1 className="font-sans text-2xl font-extrabold text-foreground">Pass it forward</h1>
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">
                Join to get your own code — everyone who joins with it becomes part of your chain.
              </p>
              <JoinGate
                title="Get your pass code"
                body="Commit to acts of kindness, then share your code so the people you pass it to join your chain."
              />
            </div>
          ) : (
            <MyCode
              code={code}
              passUrl={passUrl}
              carried={me?.peoplePassedTo ?? 0}
              displayName={me?.displayName ?? "Friend"}
              memberSince={user.created_at ? memberSinceFormatter.format(new Date(user.created_at)) : null}
            />
          )
        ) : (
          <ScanPanel />
        )}
      </div>
    </div>
  );
}

function MyCode({
  code,
  passUrl,
  carried,
  displayName,
  memberSince,
}: {
  code: string;
  passUrl: string;
  carried: number;
  displayName: string;
  memberSince: string | null;
}) {
  const qrRef = useRef<PassQrCodeHandle>(null);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.07em] text-app-ink/50">Share the chain</p>
        <p className="mt-1 text-[19px] font-bold text-foreground">
          Let someone scan this to pass kindness your way
        </p>
      </div>

      <div className="flex w-full flex-col items-center gap-4 rounded-3xl border border-border bg-app-surface p-6 shadow-sm">
        <div className="w-[220px] max-w-full rounded-[18px] bg-app-ink p-3.5">
          <PassQrCode ref={qrRef} value={passUrl} />
        </div>

        <div className="text-center">
          <p className="text-base font-bold text-foreground">{displayName}</p>
          {memberSince && (
            <p className="mt-0.5 text-xs text-muted-foreground">Member since {memberSince}</p>
          )}
          <p className="mt-1 text-[11px] uppercase tracking-[0.1em] text-muted-foreground">
            {code || "…"}
          </p>
        </div>

        <div className="flex w-full gap-2.5">
          <button
            type="button"
            onClick={async () => {
              const url = passUrl;
              try {
                if (navigator.share) await navigator.share({ url, title: "Pásalo Pa'lante" });
                else {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied.");
                }
              } catch {
                /* dismissed */
              }
            }}
            className="flex h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl bg-app-coral font-bold text-app-surface"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
          <button
            type="button"
            onClick={async () => {
              try {
                await qrRef.current?.download();
              } catch {
                toast.error("Couldn't save the code image — please try again.");
              }
            }}
            aria-label="Save pass code image"
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl border border-border bg-app-surface"
          >
            <Download className="h-5 w-5 text-foreground" />
          </button>
        </div>
      </div>

      <div className="flex w-full items-start gap-2.5 rounded-2xl bg-app-sky/[0.08] p-4">
        <Info className="mt-0.5 h-[18px] w-[18px] shrink-0 text-app-sky" strokeWidth={1.8} />
        <p className="text-xs leading-relaxed text-foreground">
          This code never expires. Anyone who scans it can pass an act of kindness straight to you —
          find it here anytime from the Share QR button in your dashboard.
        </p>
      </div>

      <div className="w-full rounded-2xl border border-border bg-app-surface p-4">
        <p className="flex items-baseline gap-2.5">
          <span className="text-xl font-extrabold text-foreground">{carried}</span>
          <span className="text-sm text-muted-foreground">people have joined with your code</span>
        </p>
        <p className="mt-3 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
          Everyone who joins with your code becomes part of your chain, and their acts count toward
          your ripple.
        </p>
      </div>
    </div>
  );
}

function ScanPanel() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [denied, setDenied] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const resultRef = useRef<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    let raf = 0;

    /** Pull the pass code out of whatever the QR encodes (URL or bare code).
     *  Preserves case exactly — log_pass_handoff matches it case-sensitively
     *  against the lowercase hex value actually stored on the profile. */
    const readCode = (raw: string) => {
      try {
        const url = new URL(raw);
        return url.searchParams.get("ref") || raw;
      } catch {
        return raw;
      }
    };

    const handle = (raw: string) => {
      if (resultRef.current) return;
      const code = readCode(raw);
      resultRef.current = code;
      setResult(code);
      toast.success(`Pass code scanned: ${code}`);
      // Go straight to the connect screen rather than waiting on a second
      // tap on "Open their pass" — a brief pause so the toast/code are
      // actually visible before the page changes.
      window.setTimeout(() => {
        if (cancelled) return;
        navigate(`/wave?ref=${encodeURIComponent(code)}`);
      }, 700);
    };

    const startLoop = async () => {
      const video = videoRef.current;
      if (!video) return;

      // Chrome/Android decode natively; everything else falls back to jsQR.
      const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;
      const jsQR = detector ? null : (await import("jsqr")).default;

      const tick = async () => {
        if (cancelled) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA && !resultRef.current) {
          try {
            if (detector) {
              const [hit] = await detector.detect(video);
              if (hit?.rawValue) handle(hit.rawValue);
            } else if (jsQR && canvasRef.current) {
              const canvas = canvasRef.current;
              const w = (canvas.width = video.videoWidth);
              const h = (canvas.height = video.videoHeight);
              const ctx = canvas.getContext("2d", { willReadFrequently: true });
              if (ctx && w && h) {
                ctx.drawImage(video, 0, 0, w, h);
                const hit = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
                if (hit?.data) handle(hit.data);
              }
            }
          } catch {
            /* keep scanning */
          }
        }
        raf = requestAnimationFrame(() => void tick());
      };
      void tick();
    };

    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "environment" } })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          // The `autoplay` attribute alone doesn't reliably start playback
          // for a srcObject assigned programmatically after mount — most
          // notably on iOS Safari, where this is a known gap. Without this,
          // the permission prompt succeeds, the stream is live, and the
          // video element just never actually plays: a black frame with no
          // error, indistinguishable from "camera isn't working."
          videoRef.current.play().catch(() => {
            /* Autoplay can still be blocked in rare cases; scanning simply
             * won't start rather than throwing — nothing else to recover
             * with here since this stream came from a user-initiated scan. */
          });
          void startLoop();
        }
      })
      .catch(() => !cancelled && setDenied(true));

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-center">
        <p className="text-xs font-bold uppercase tracking-[0.07em] text-app-ink/50">Receive the chain</p>
        <p className="mt-1 text-[19px] font-bold text-foreground">Scan someone's code to pass kindness to them</p>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-3xl bg-app-ink">
        {denied ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center">
            <Camera className="h-8 w-8 text-app-surface/60" />
            <p className="text-sm text-app-surface/80">
              Camera access is off. Allow it in your browser settings to scan a code.
            </p>
          </div>
        ) : (
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="h-full w-full object-cover"
            aria-label="Camera viewfinder"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        {/* Orange corner brackets frame the scan area instead of a uniform border. */}
        <div className="pointer-events-none absolute inset-8">
          <span className="absolute left-0 top-0 h-9 w-9 rounded-tl-xl border-l-[3px] border-t-[3px] border-app-coral" />
          <span className="absolute right-0 top-0 h-9 w-9 rounded-tr-xl border-r-[3px] border-t-[3px] border-app-coral" />
          <span className="absolute bottom-0 left-0 h-9 w-9 rounded-bl-xl border-b-[3px] border-l-[3px] border-app-coral" />
          <span className="absolute bottom-0 right-0 h-9 w-9 rounded-br-xl border-b-[3px] border-r-[3px] border-app-coral" />
        </div>
      </div>

      {result ? (
        <div className="w-full rounded-2xl border border-border bg-app-surface p-4">
          <p className="text-sm font-semibold text-foreground">Scanned pass code</p>
          <p className="mt-1 text-xl font-extrabold tracking-[0.15em] text-foreground">{result}</p>
          <a
            href={`/wave?ref=${encodeURIComponent(result)}`}
            className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-app-coral font-semibold text-app-surface"
          >
            Open their pass
          </a>
        </div>
      ) : (
        <p className="w-full text-center text-xs leading-relaxed text-muted-foreground">
          Hold steady — the code is read automatically as soon as it fits inside the frame.
        </p>
      )}

      <TroubleshootPanel />
    </div>
  );
}

function TroubleshootPanel() {
  const [open, setOpen] = useState(false);
  const steps = (icon: React.ReactNode, list: string[]) =>
    list.map((s, i) => (
      <li key={i} className="flex gap-2.5">
        <span className="mt-0.5 shrink-0 text-app-coral">{icon}</span>
        <span className="text-xs leading-relaxed text-muted-foreground">{s}</span>
      </li>
    ));

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-border bg-app-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
          <HelpCircle className="h-4 w-4" />
          Can't scan? Troubleshooting tips
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Apple className="h-4 w-4" /> iPhone
              </p>
              <ul className="mt-2.5 space-y-2">
                {steps(
                  <Apple className="h-3.5 w-3.5" />,
                  [
                    "Open the page in Safari — the camera works best there. Chrome on iPhone can't access the back camera.",
                    "Tap the AA / lock icon in the address bar → Website Settings → Camera → Allow.",
                    "Hold the phone about 6–10 inches (15–25 cm) from the code, steady and flat.",
                    "If nothing happens after 5 seconds, refresh the page and try again — iOS sometimes blocks the camera on the first load.",
                    "Make sure the code fills most of the on-screen frame, and that nothing glares on it.",
                  ],
                )}
              </ul>
            </div>

            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Smartphone className="h-4 w-4" /> Android
              </p>
              <ul className="mt-2.5 space-y-2">
                {steps(
                  <Smartphone className="h-3.5 w-3.5" />,
                  [
                    "Use Chrome. When the page opens, tap Allow on the camera permission pop-up.",
                    "If you tapped Deny by mistake: Chrome → ⋮ → Settings → Site permissions → Camera → allow this site.",
                    "Hold the phone 6–10 inches (15–25 cm) away and keep the code inside the frame.",
                    "Bright reflections or a dirty lens can block the read — wipe the lens and angle away from glare.",
                    "Some Android skins throttle background apps; keep this tab in the foreground while scanning.",
                  ],
                )}
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-app-canvas p-3">
            <p className="text-xs font-semibold text-foreground">Still not scanning?</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Ask the other person to open the <span className="font-semibold">My Code</span> tab and
              read the code aloud, then type it into the box below to log the hand-off manually.
            </p>
            <ManualEntry />
          </div>
        </div>
      )}
    </div>
  );
}

function ManualEntry() {
  const [val, setVal] = useState("");
  const valid = val.trim().length >= 4;
  return (
    <div className="mt-2.5 flex gap-2">
      <input
        value={val}
        // The code is displayed in uppercase (CSS only), but the actual
        // stored value is lowercase hex and matched case-sensitively — so
        // whatever someone types (reading the uppercase display) needs to
        // be lowered before it'll match.
        onChange={(e) => setVal(e.target.value.toLowerCase())}
        placeholder="ENTER CODE"
        aria-label="Type pass code manually"
        className="flex-1 rounded-xl border border-border bg-app-surface px-3 py-2.5 text-sm font-bold uppercase tracking-wider text-foreground placeholder:font-normal placeholder:normal-case placeholder:tracking-normal placeholder:text-muted-foreground"
      />
      <a
        href={valid ? `/wave?ref=${encodeURIComponent(val.trim())}` : undefined}
        aria-disabled={!valid}
        className={cn(
          "flex h-[42px] items-center justify-center rounded-xl px-4 text-sm font-semibold transition-opacity",
          valid ? "bg-app-ink text-app-surface" : "cursor-not-allowed bg-app-ink/40 text-app-surface/60",
        )}
      >
        Open
      </a>
    </div>
  );
}
