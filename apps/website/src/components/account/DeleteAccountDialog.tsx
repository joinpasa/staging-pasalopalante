import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@shared/contexts/LanguageContext";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@shared/components/ui/alert-dialog";
import { Button } from "@shared/components/ui/button";
import { Input } from "@shared/components/ui/input";

// The user must type this exact word (in any language) to unlock the final button.
const CONFIRM_WORD = "delete";

const DeleteAccountDialog = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  const handleDelete = async () => {
    // TODO: actually delete the account and all related data (next step).
    toast(t.account.deleteAccountComingSoon);
    setOpen(false);
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setTyped("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className="text-destructive hover:text-destructive mb-12 ml-2">
          <Trash2 size={16} className="mr-2" />
          {t.account.deleteAccount}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t.account.deleteAccountTitle}</AlertDialogTitle>
          <AlertDialogDescription>{t.account.deleteAccountWarning}</AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <label htmlFor="delete-account-confirm" className="text-sm text-foreground/80">
            {t.account.deleteAccountConfirmPrompt.split("{word}")[0]}
            <strong className="font-mono">{CONFIRM_WORD}</strong>
            {t.account.deleteAccountConfirmPrompt.split("{word}")[1]}
          </label>
          <Input
            id="delete-account-confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.account.deleteAccountCancel}</AlertDialogCancel>
          <Button variant="destructive" disabled={!confirmed} onClick={handleDelete}>
            {t.account.deleteAccountConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountDialog;
