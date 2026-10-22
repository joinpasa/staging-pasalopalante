import { Checkbox } from "@shared/components/ui/checkbox";
import { useLanguage } from "@shared/contexts/LanguageContext";

/**
 * Optional A2P 10DLC SMS consent checkbox — goes directly above a form's
 * submit button on every form that collects a phone number. Unchecked by
 * default and never required to submit (carrier rules: consent to texts
 * can't be a condition of participation). The wording is fixed by the
 * 10DLC campaign registration — don't edit it without updating that too.
 * STOP/HELP stay in English in every language; they're carrier keywords.
 */
export default function SmsConsentCheckbox({
  id,
  checked,
  onCheckedChange,
  variant = "ui",
}: {
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** "native" = plain square checkbox, to match forms whose other checkboxes
   * (e.g. the pledge form's Terms box) are native inputs. */
  variant?: "ui" | "native";
}) {
  const { lang } = useLanguage();
  const isEs = lang === "es";
  const linkClass = "text-warm-sky underline underline-offset-2";

  return (
    <div className={`flex items-start ${variant === "native" ? "gap-2" : "gap-3"}`}>
      {variant === "native" ? (
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-primary cursor-pointer"
        />
      ) : (
        <Checkbox
          id={id}
          className="mt-1"
          checked={checked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
        />
      )}
      <label
        htmlFor={id}
        className={`cursor-pointer leading-relaxed text-foreground/80 ${variant === "native" ? "text-xs" : "text-sm"}`}
      >
        {isEs ? (
          <>
            Acepto recibir mensajes de texto de Pass Kindness Forward con recordatorios de eventos, novedades y
            formas de participar. La frecuencia de los mensajes varía, pueden aplicar tarifas de mensajes y datos.
            Responde STOP para cancelar, HELP para obtener ayuda.{" "}
            <a href="/privacy#sms" target="_blank" rel="noopener noreferrer" className={linkClass}>
              Política de Privacidad
            </a>{" "}
            y{" "}
            <a href="/terms#sms" target="_blank" rel="noopener noreferrer" className={linkClass}>
              Términos de SMS
            </a>
            .
          </>
        ) : (
          <>
            I agree to receive text messages from Pass Kindness Forward with event reminders, updates and ways to
            get involved. Msg frequency varies, msg &amp; data rates may apply. Reply STOP to opt out, HELP for
            help.{" "}
            <a href="/privacy#sms" target="_blank" rel="noopener noreferrer" className={linkClass}>
              Privacy Policy
            </a>{" "}
            &amp;{" "}
            <a href="/terms#sms" target="_blank" rel="noopener noreferrer" className={linkClass}>
              SMS Terms
            </a>
            .
          </>
        )}
      </label>
    </div>
  );
}
