import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@shared/contexts/LanguageContext";
import { supabase } from "@shared/integrations/supabase/client";
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
  const [deleting, setDeleting] = useState(false);
  const navigate = useNavigate();
  const confirmed = typed.trim().toLowerCase() === CONFIRM_WORD;

  // Everything (data, photos, CRM tag, the login itself) is done server-side
  // by the delete-account edge function; see its header for what's removed.
  const handleDelete = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    if (error || !data?.success) {
      console.error("delete-account failed", error ?? data);
      toast.error(t.account.deleteAccountError);
      setDeleting(false);
      return;
    }
    // The user no longer exists server-side, so only clear the local session.
    await supabase.auth.signOut({ scope: "local" });
    toast.success(t.account.deleteAccountSuccess);
    navigate("/", { replace: true });
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (deleting) return;
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
            disabled={deleting}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>{t.account.deleteAccountCancel}</AlertDialogCancel>
          <Button variant="destructive" disabled={!confirmed || deleting} onClick={handleDelete}>
            {deleting && <Loader2 size={16} className="mr-2 animate-spin" />}
            {t.account.deleteAccountConfirm}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DeleteAccountDialog;
