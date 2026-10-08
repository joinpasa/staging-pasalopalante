import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle } from "lucide-react";
import { useCopy } from "@/lib/i18n";
import { useDeleteAct, type Submission } from "@/lib/submissions";

/**
 * Permanent delete, guarded by typing a confirmation word (DELETE, or
 * ELIMINAR in Spanish — either is accepted). Nothing is recoverable after.
 */
export default function DeleteActDialog({ act, onClose }: { act: Submission | null; onClose: () => void }) {
  const { t } = useCopy();
  const del = useDeleteAct();
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (act) {
      setTyped("");
      setError(null);
    }
  }, [act]);

  const word = typed.trim().toUpperCase();
  const confirmed = word === "DELETE" || word === "ELIMINAR";

  const onDelete = async () => {
    if (!act || !confirmed) return;
    setError(null);
    try {
      await del.mutateAsync(act.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Dialog.Root open={!!act} onOpenChange={(o) => !o && !del.isPending && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-navy/50" />
        <Dialog.Content className="fixed start-1/2 top-1/2 z-50 flex w-[calc(100%-32px)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-3xl bg-white p-6 text-ink shadow-[0_24px_64px_rgba(14,35,75,0.25)] outline-none rtl:translate-x-1/2">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-soft">
            <AlertTriangle className="h-6 w-6 text-rose" aria-hidden="true" />
          </div>
          <Dialog.Title className="m-0 text-xl font-extrabold">{t.deleteTitle}</Dialog.Title>
          {act && (
            <p className="m-0 rounded-xl bg-canvas px-3.5 py-2.5 text-sm font-semibold [overflow-wrap:anywhere]">
              “{act.description}”
            </p>
          )}
          <Dialog.Description className="m-0 text-[15px] leading-relaxed text-ink-muted">{t.deleteBody}</Dialog.Description>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void onDelete();
            }}
            className="flex flex-col gap-2"
          >
            <label htmlFor="delete-confirm" className="label">
              {t.deleteTypeToConfirm}
            </label>
            <input
              id="delete-confirm"
              type="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={t.deleteWord}
              className="field font-bold tracking-[0.12em]"
            />
            {error && (
              <p role="alert" className="m-0 text-sm font-semibold text-rose-ink">
                {error}
              </p>
            )}
            <div className="mt-2 flex gap-3">
              <button type="button" onClick={onClose} disabled={del.isPending} className="btn-secondary h-12 flex-1 px-4 text-[15px]">
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!confirmed || del.isPending}
                className="inline-flex h-12 flex-[1.4] items-center justify-center whitespace-nowrap rounded-[14px] bg-rose px-4 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
              >
                {del.isPending ? t.deleting : t.deleteForever}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
