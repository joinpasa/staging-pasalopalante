import { useEffect } from "react";

const EMBED_SCRIPT_SRC = "https://link.msgsndr.com/js/form_embed.js";

/**
 * GoHighLevel's embed snippet is an <iframe> plus a <script> that makes the
 * iframe auto-resize to its content via postMessage (the iframe itself has
 * no fixed height and scrolling="no"). The script is shared by every GHL
 * form on the page, so it's only added to the document once no matter how
 * many GHLFormEmbed instances are mounted.
 */
function ensureEmbedScript() {
  if (document.querySelector(`script[src="${EMBED_SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = EMBED_SCRIPT_SRC;
  document.body.appendChild(script);
}

interface GHLFormEmbedProps {
  formId: string;
  title: string;
}

export default function GHLFormEmbed({ formId, title }: GHLFormEmbedProps) {
  useEffect(() => {
    ensureEmbedScript();
  }, []);

  return (
    <iframe
      src={`https://api.leadconnectorhq.com/widget/survey/${formId}`}
      style={{ border: "none", width: "100%" }}
      scrolling="no"
      id={formId}
      title={title}
      data-cookie-consent="true"
      data-cookie-consent-provider="auto"
    />
  );
}
