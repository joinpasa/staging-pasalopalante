import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Camera, Download, Share2, HelpCircle, ChevronDown, Apple, Smartphone } from "lucide-react";
import PassQrCode from "@/components/app/PassQrCode";
import JoinGate from "@/components/app/JoinGate";
import { useAuth } from "@shared/contexts/AuthContext";
import { useAppMe } from "@/hooks/useAppData";
import { cn } from "@shared/lib/utils";

type PassTab = "code" | "scan";

export default function AppPass() {
  const [tab, setTab] = useState<PassTab>("code");
  const { user } = useAuth();
  const { data: me } = useAppMe();

  // Your invite code comes from your profile, so the chain it builds is real.
  const code = (me?.referralCode ?? "").toUpperCase();
  const passUrl = code ? `app.pasalopalante.com?ref=${code}` : "app.pasalopalante.com";

  return (
    <div className="flex-1 bg-app-coral px-5 pt-5 text-app-surface">
      <div className="flex rounded-full bg-app-surface/20 p-1" role="tablist" aria-label="Pass mode">
        {(
          [
            { id: "code", label: "My code" },
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
              tab === id ? "bg-app-surface text-app-coral" : "text-app-surface",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "code" ? (
        !user ? (
          <div className="pt-6">
            <h1 className="text-center font-sans text-2xl font-extrabold">Pass it forward</h1>
            <p className="mx-auto mt-2 mb-5 max-w-xs text-center text-sm leading-relaxed text-app-surface/85">
              Join to get your own code — everyone who joins with it becomes part of your chain.
            </p>
            <JoinGate
              title="Get your pass code"
              body="Commit to acts of kindness, then share your code so the people you pass it to join your chain."
            />
          </div>
        ) : (
          <MyCode code={code} passUrl={passUrl} carried={me?.peoplePassedTo ?? 0} />
        )
      ) : (
        <ScanPanel />
      )}
    </div>
  );
}


function MyCode({
  code,
  passUrl,
  carried,
}: {
  code: string;
  passUrl: string;
  carried: number;
}) {
  return (
    <div className="pt-6">
      <h1 className="text-center font-sans text-2xl font-extrabold">Pass it forward</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-app-surface/85">
        Let them scan this. No app yet? It takes them to join. Already in? The hand-off is logged and
        they join your chain.
      </p>

      <div className="mt-5 rounded-3xl bg-app-surface p-5">
        <PassQrCode value={`https://${passUrl}`} />
        <p className="mt-3 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Your pass code
        </p>
        <div className="mt-1 flex items-center justify-center gap-3">
          <p className="font-sans text-2xl font-extrabold tracking-[0.15em] text-foreground">
            {code || "…"}
          </p>
        </div>
        <p className="mt-1 text-center text-xs text-muted-foreground">{passUrl}</p>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={async () => {
            const url = `https://${passUrl}`;
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
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-app-ink font-semibold text-app-surface"
        >
          <Share2 className="h-4 w-4" />
          Share my link
        </button>
        <button
          type="button"
          onClick={() => toast.success("Saving the code image is not wired up in the beta yet.")}
          aria-label="Save pass code image"
          className="flex h-14 w-14 items-center justify-center rounded-2xl border border-app-surface/40"
        >
          <Download className="h-5 w-5" />
        </button>
      </div>

      <div className="mt-4 rounded-2xl bg-app-surface/15 p-4">
        <p className="flex items-baseline gap-2.5">
          <span className="font-sans text-xl font-extrabold">{carried}</span>
          <span className="text-sm text-app-surface/90">people have joined with your code</span>
        </p>
        <p className="mt-3 border-t border-app-surface/20 pt-3 text-xs leading-relaxed text-app-surface/75">
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

    /** Pull the pass code out of whatever the QR encodes (URL or bare code). */
    const readCode = (raw: string) => {
      try {
        const url = new URL(raw);
        return (url.searchParams.get("ref") ?? "").toUpperCase() || raw;
      } catch {
        return raw.toUpperCase();
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
    <div className="pt-6">
      <h1 className="text-center font-sans text-2xl font-extrabold">Scan their code</h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-sm leading-relaxed text-app-surface/85">
        Point the camera at a pass code to log the hand-off and add them to your chain.
      </p>

      <div className="relative mt-5 aspect-square overflow-hidden rounded-3xl bg-app-ink">
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
        <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-app-surface/70" />
      </div>

      {result ? (
        <div className="mt-4 rounded-2xl bg-app-surface/15 p-4">
          <p className="text-sm font-semibold">Scanned pass code</p>
          <p className="mt-1 font-sans text-xl font-extrabold tracking-[0.15em]">{result}</p>
          <a
            href={`/wave?ref=${encodeURIComponent(result)}`}
            className="mt-3 flex h-12 items-center justify-center rounded-2xl bg-app-ink font-semibold text-app-surface"
          >
            Open their pass
          </a>
        </div>
      ) : (
        <p className="mt-4 rounded-2xl bg-app-surface/15 p-4 text-xs leading-relaxed text-app-surface/75">
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
        <span className="mt-0.5 shrink-0 text-app-teal">{icon}</span>
        <span className="text-xs leading-relaxed text-app-surface/85">{s}</span>
      </li>
    ));

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border border-app-surface/25 bg-app-surface/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2.5 text-sm font-semibold text-app-surface">
          <HelpCircle className="h-4 w-4" />
          Can't scan? Troubleshooting tips
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-app-surface/70 transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="border-t border-app-surface/20 px-4 py-4">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-app-surface">
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
              <p className="flex items-center gap-2 text-sm font-bold text-app-surface">
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

          <div className="mt-4 rounded-xl bg-app-surface/15 p-3">
            <p className="text-xs font-semibold text-app-surface">Still not scanning?</p>
            <p className="mt-1 text-xs leading-relaxed text-app-surface/80">
              Ask the other person to open the <span className="font-semibold">My code</span> tab and
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
        onChange={(e) => setVal(e.target.value.toUpperCase())}
        placeholder="ENTER CODE"
        aria-label="Type pass code manually"
        className="flex-1 rounded-xl bg-app-surface px-3 py-2.5 text-sm font-bold tracking-wider text-app-ink placeholder:font-normal placeholder:tracking-normal placeholder:text-app-ink/40"
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

