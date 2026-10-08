import { useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Check, Copy, Download, Printer, RefreshCw, Share2, ShieldAlert } from "lucide-react";
import PortalHeader from "@/components/PortalHeader";
import { useCopy } from "@/lib/i18n";
import { buildQrCard, inviteUrl, useInviteToken, useResetInvite } from "@/lib/invite";
import { useSession } from "@/lib/session";
import { publicOrigin } from "@/lib/links";

const HEART = { src: "/kf-heart.webp", excavate: true };

function slug(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "team";
}

/** /invite — the organization's join QR code and link, plus a printable poster. */
export default function InvitePage() {
  const { t } = useCopy();
  const { partner } = useSession();
  const invite = useInviteToken();
  const reset = useResetInvite();
  const [copied, setCopied] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const org = partner?.name ?? "";
  const url = invite.data ? inviteUrl(invite.data) : "";
  const canShare = typeof navigator !== "undefined" && !!navigator.share;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked: the link is selectable in the field */
    }
  };

  const download = async () => {
    const canvas = exportRef.current?.querySelector("canvas");
    if (!canvas) return;
    const blob = await buildQrCard(canvas, org, t.qrCardCaption);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `invite-qr-${slug(org)}.png`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const share = async () => {
    try {
      await navigator.share({ title: t.inviteTitle, text: t.shareText(org), url });
    } catch {
      /* dismissed */
    }
  };

  const doReset = async () => {
    try {
      await reset.mutateAsync();
      setConfirmReset(false);
      setResetDone(true);
    } catch {
      /* shown in the dialog */
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas print:min-h-0 print:bg-white">
      <div className="print:hidden">
        <PortalHeader />
      </div>

      <main className="mx-auto flex w-full max-w-[1100px] flex-col gap-6 px-4 py-6 print:hidden lg:px-10 lg:py-10">
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 text-[28px] font-extrabold lg:text-4xl">{t.inviteTitle}</h1>
          <p className="m-0 max-w-[640px] text-base leading-relaxed text-ink-muted">{t.inviteBody(org)}</p>
        </div>

        {invite.isError ? (
          <p role="alert" className="m-0 rounded-2xl bg-rose-soft p-4 text-sm font-semibold text-rose-ink">
            {t.inviteLoadError}
          </p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,420px)_1fr]">
            {/* QR card */}
            <section className="flex flex-col items-center gap-5 rounded-3xl bg-white p-6 shadow-card lg:p-8">
              <div className="flex aspect-square w-full max-w-[300px] items-center justify-center rounded-2xl border border-line-soft p-3">
                {url ? (
                  <QRCodeSVG value={url} size={276} level="H" marginSize={1} fgColor="#0E234B" imageSettings={{ ...HEART, height: 56, width: 56 }} className="h-full w-full" />
                ) : (
                  <div className="h-full w-full animate-pulse rounded-xl bg-canvas" />
                )}
              </div>
              <span className="text-center text-lg font-extrabold">{org}</span>
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => void download()} disabled={!url} className="btn-secondary h-12 gap-2 whitespace-nowrap px-3 text-[15px]">
                  <Download className="h-[18px] w-[18px]" />
                  {t.downloadQr}
                </button>
                <button type="button" onClick={() => window.print()} disabled={!url} className="btn-secondary h-12 gap-2 whitespace-nowrap px-3 text-[15px]">
                  <Printer className="h-[18px] w-[18px]" />
                  {t.printPoster}
                </button>
              </div>
            </section>

            <div className="flex flex-col gap-6">
              {/* Link */}
              <section className="flex flex-col gap-3 rounded-3xl bg-white p-6 shadow-card lg:p-8">
                <label htmlFor="invite-link" className="label">
                  {t.inviteLink}
                </label>
                <input id="invite-link" readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="field text-[15px]" />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button type="button" onClick={() => void copy()} disabled={!url} className="btn-primary h-12 gap-2 text-base sm:flex-1">
                    {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    {copied ? t.copied : t.copyLink}
                  </button>
                  {canShare && (
                    <button type="button" onClick={() => void share()} disabled={!url} className="btn-secondary h-12 gap-2 text-base sm:flex-1">
                      <Share2 className="h-5 w-5" />
                      {t.shareInvite}
                    </button>
                  )}
                </div>
                {resetDone && (
                  <p role="status" className="m-0 rounded-xl bg-sky-soft px-3.5 py-2.5 text-sm font-semibold text-sky-ink">
                    {t.resetDone}
                  </p>
                )}
              </section>

              {/* How it works */}
              <section className="flex flex-col gap-4 rounded-3xl bg-white p-6 shadow-card lg:p-8">
                <h2 className="m-0 text-lg font-extrabold">{t.inviteHowTitle}</h2>
                <ol className="m-0 flex list-none flex-col gap-3 p-0">
                  {t.inviteSteps.map((s, i) => (
                    <li key={s} className="flex items-center gap-3 text-[15px] font-semibold">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sun text-sm font-extrabold text-navy">{i + 1}</span>
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="flex gap-2.5 rounded-xl bg-canvas px-3.5 py-3 text-sm text-ink-muted">
                  <ShieldAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-orange" aria-hidden="true" />
                  <span>
                    {t.invitePrivate}{" "}
                    <button type="button" onClick={() => setConfirmReset(true)} disabled={!url} className="inline-flex items-center gap-1 font-bold text-navy underline underline-offset-2">
                      <RefreshCw className="h-3.5 w-3.5" />
                      {t.resetLink}
                    </button>
                  </span>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Hi-res canvas used only for the PNG download. */}
      <div ref={exportRef} className="hidden" aria-hidden="true">
        {url && <QRCodeCanvas value={url} size={1024} level="H" marginSize={2} fgColor="#0E234B" imageSettings={{ ...HEART, height: 210, width: 210 }} />}
      </div>

      {/* Print-only poster */}
      {url && (
        <div className="hidden flex-col items-center gap-5 bg-white px-6 text-center text-navy [break-inside:avoid] print:flex">
          <img src="/kf-logo.webp" alt="Kindness Forward" className="h-16 w-auto" />
          <div className="flex flex-col gap-3">
            <h1 className="m-0 text-4xl font-extrabold leading-tight">{t.posterHeadline(org)}</h1>
            <p className="m-0 text-xl font-semibold text-ink-muted">{t.posterSub}</p>
          </div>
          <div className="rounded-3xl border-4 border-sun p-5">
            <QRCodeSVG value={url} size={300} level="H" marginSize={1} fgColor="#0E234B" imageSettings={{ ...HEART, height: 60, width: 60 }} />
          </div>
          <span className="text-2xl font-extrabold">{t.posterScan}</span>
          <ol className="m-0 flex list-none justify-center gap-8 p-0 text-lg font-semibold">
            {t.inviteSteps.map((s, i) => (
              <li key={s} className="flex max-w-[200px] flex-col items-center gap-2">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sun text-lg font-extrabold">{i + 1}</span>
                {s}
              </li>
            ))}
          </ol>
          <p className="m-0 text-base text-ink-muted">
            {t.posterLogin} <strong className="text-navy">{new URL(publicOrigin()).host}</strong>
          </p>
        </div>
      )}

      <Dialog.Root open={confirmReset} onOpenChange={(o) => !reset.isPending && setConfirmReset(o)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/50" />
          <Dialog.Content className="fixed start-1/2 top-1/2 z-50 flex w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl bg-white p-6 text-ink shadow-[0_24px_64px_rgba(14,35,75,0.25)] outline-none rtl:translate-x-1/2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sun-soft">
              <AlertTriangle className="h-6 w-6 text-sun-ink" aria-hidden="true" />
            </div>
            <Dialog.Title className="m-0 text-xl font-extrabold">{t.resetTitle}</Dialog.Title>
            <Dialog.Description className="m-0 text-[15px] leading-relaxed text-ink-muted">{t.resetBody}</Dialog.Description>
            {reset.isError && (
              <p role="alert" className="m-0 text-sm font-semibold text-rose-ink">
                {reset.error instanceof Error ? reset.error.message : String(reset.error)}
              </p>
            )}
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={() => setConfirmReset(false)} disabled={reset.isPending} className="btn-secondary h-12 flex-1 px-4 text-[15px]">
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={() => void doReset()}
                disabled={reset.isPending}
                className="inline-flex h-12 flex-[1.4] items-center justify-center whitespace-nowrap rounded-[14px] bg-navy px-4 text-[15px] font-bold text-white disabled:opacity-50"
              >
                {reset.isPending ? t.resetting : t.resetLink}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
