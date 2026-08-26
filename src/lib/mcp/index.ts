import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyProfile from "./tools/get-my-profile";
import listMyActs from "./tools/list-my-acts";
import listMyCommitments from "./tools/list-my-commitments";
import getPledgeTotals from "./tools/get-pledge-totals";

// Build the Supabase OAuth issuer from the project ref only. Vite inlines
// VITE_SUPABASE_PROJECT_ID at build time so this stays import-safe (no runtime
// env read at module top-level). The fallback keeps the issuer well-formed
// during the manifest-extract eval, where no token is ever verified.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "pasalopalante-mcp",
  title: "Pásalo Pa'lante",
  version: "0.1.0",
  instructions:
    "Tools for the Pásalo Pa'lante kindness movement. Authenticated tools act as the signed-in user and respect row-level security. Use `get_my_profile`, `list_my_acts`, and `list_my_commitments` to read the user's own data, and `get_pledge_totals` for global movement totals.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyProfile, listMyActs, listMyCommitments, getPledgeTotals],
});
