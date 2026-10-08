import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Dialog, DialogContent } from "@shared/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  busy?: boolean;
}

const CONFIRM_WORD = "DELETE";

export default function DeleteActDialog({ open, onOpenChange, onConfirm, busy }: Props) {
  const [typed, setTyped] = useState("");
  const canDelete = typed.trim() === CONFIRM_WORD;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTyped("");
      }}
    >
      <DialogContent className="max-w-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-[18px] w-[18px] text-destructive" />
            </span>
            <h2 className="text-base font-bold text-foreground">Delete this act?</h2>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Are you sure you want to delete this? Once deleted, it can't be retrieved.
          </p>
          <div className="space-y-1.5">
            <label htmlFor="delete-confirm-input" className="text-sm leading-relaxed text-muted-foreground">
              Type <strong className="text-foreground">{CONFIRM_WORD}</strong> to confirm.
            </label>
            <input
              id="delete-confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRM_WORD}
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              className="w-full rounded-xl border-[1.5px] border-app-ink/[0.14] bg-app-surface px-3.5 py-2.5 text-sm text-foreground outline-none focus:border-app-coral"
            />
          </div>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex-1 rounded-xl border border-border py-2.5 text-sm font-semibold text-foreground"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canDelete || busy}
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-destructive py-2.5 text-sm font-bold text-destructive-foreground disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
