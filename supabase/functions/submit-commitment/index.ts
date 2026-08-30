import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const TYPES = ["individual", "organization"] as const;
const HELP_ROLES = ["do_acts", "champion", "ambassador", "civic", "volunteer"] as const;
const ORG_TYPES = ["school", "company", "nonprofit", "ngo", "faith", "other"] as const;

interface Body {
  type: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  org_name?: string;
  chapter?: string;
  org_website?: string;
  pledge_count?: number;
  message?: string;
  help_role?: string | null;
  country?: string | null;
  org_type?: string | null;
}

function bad(msg: string, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body || typeof body !== "object") return bad("Invalid body");
    if (!TYPES.includes(body.type as typeof TYPES[number])) return bad("Invalid type");

    const firstName = (body.first_name ?? "").toString().trim().slice(0, 60);
    const lastName = (body.last_name ?? "").toString().trim().slice(0, 60);
    const email = (body.email ?? "").toString().trim().slice(0, 200);
    const orgNameRaw = (body.org_name ?? "").toString().trim().slice(0, 120);
    const chapter = (body.chapter ?? "").toString().trim().slice(0, 120);
    const orgName = chapter ? `${orgNameRaw} — ${chapter}`.slice(0, 240) : orgNameRaw;
    const orgWebsite = (body.org_website ?? "").toString().trim().slice(0, 300);
    const message = (body.message ?? "").toString().trim().slice(0, 600);
    let pledgeCount = Number.isFinite(body.pledge_count) ? Math.floor(body.pledge_count!) : 1;
    if (pledgeCount < 1) pledgeCount = 1;
    if (pledgeCount > 1_000_000_000) pledgeCount = 1_000_000_000;

    if (!email || !isEmail(email)) return bad("A valid email is required");
    if (!firstName) return bad("First name is required");
    if (!lastName) return bad("Last name is required");

    if (body.type === "organization") {
      if (!orgNameRaw) return bad("Organization name is required");
      if (!orgWebsite) return bad("Website is required");
      if (!/^https?:\/\//i.test(orgWebsite)) return bad("Website must start with http(s)://");
    } else if (orgWebsite && !/^https?:\/\//i.test(orgWebsite)) {
      return bad("Website must start with http(s)://");
    }

    // Lightweight AI safety check on the message only (optional)
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    let safe = true;
    let reason: string | null = null;
    let language = "en";

    if (message && GEMINI_API_KEY) {
      try {
        const aiRes = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${GEMINI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content:
                  "You moderate short pledge messages on a public kindness wall. Reject hateful, sexually explicit, harassing content, personal contact info, or spam. Always call moderate_message.",
              },
              { role: "user", content: message },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "moderate_message",
                  description: "Moderate a pledge message.",
                  parameters: {
                    type: "object",
                    properties: {
                      safe: { type: "boolean" },
                      reason: { type: "string" },
                      language: { type: "string" },
                    },
                    required: ["safe", "language"],
                    additionalProperties: false,
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "moderate_message" } },
          }),
        });
        if (aiRes.status === 429) return bad("Too many requests, please retry shortly.", 429);
        if (aiRes.status === 402) return bad("AI credits exhausted.", 402);
        if (aiRes.ok) {
          const data = await aiRes.json();
          const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
          if (args) {
            const parsed = JSON.parse(args);
            safe = parsed.safe !== false;
            reason = parsed.reason ?? null;
            language = (parsed.language || "en").toString().slice(0, 8);
          }
        }
      } catch (e) {
        console.error("AI moderation error", e);
      }
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      try {
        const { data: u } = await supabase.auth.getUser(authHeader.slice(7));
        userId = u?.user?.id ?? null;
      } catch (_) { /* ignore */ }
    }

    const status = safe ? "published" : "rejected";

    const helpRole = body.help_role && HELP_ROLES.includes(body.help_role as any) ? body.help_role : null;
    const country = (body.country ?? "").toString().trim().slice(0, 80) || null;
    if (!country) return bad("Country is required");
    const orgType = body.org_type && ORG_TYPES.includes(body.org_type as any) ? body.org_type : null;

    const { data, error } = await supabase
      .from("commitments")
      .insert({
        type: body.type,
        first_name: firstName || null,
        last_name: lastName || null,
        email: email || null,
        org_name: orgName || null,
        org_website: orgWebsite || null,
        pledge_count: pledgeCount,
        message: message || null,
        language,
        status,
        moderation_reason: reason,
        user_id: userId,
        help_role: body.type === "individual" ? helpRole : null,
        country,
        org_type: body.type === "organization" ? orgType : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("DB error", error);
      return bad("Could not save commitment", 500);
    }

    if (!safe) {
      return bad("Your message couldn't be published. Please rephrase and try again.", 422);
    }

    // Sync role/org fields onto the user's profile (CRM-ready). Never overwrite with null.
    if (userId) {
      try {
        const profileUpdate: Record<string, string> = {};
        if (body.type === "individual" && helpRole) profileUpdate.help_role = helpRole;
        if (country) profileUpdate.country = country;
        if (firstName) profileUpdate.first_name = firstName;
        if (lastName) profileUpdate.last_name = lastName;
        if (body.type === "organization" && orgNameRaw) profileUpdate.org_name = orgNameRaw;
        if (body.type === "organization" && orgType) profileUpdate.org_type = orgType;
        if (Object.keys(profileUpdate).length > 0) {
          await supabase.from("profiles").update(profileUpdate).eq("user_id", userId);
        }
      } catch (e) {
        console.error("profile sync error", e);
      }
    }

    // For organization commitments, ensure org row + leader membership when signed in
    if (body.type === "organization" && orgNameRaw) {
      try {
        const { data: existing } = await supabase
          .from("organizations")
          .select("id")
          .ilike("name", orgNameRaw)
          .is("chapter", chapter ? undefined as any : null)
          .maybeSingle();
        let orgId = existing?.id as string | undefined;
        if (!orgId) {
          const { data: created } = await supabase
            .from("organizations")
            .insert({
              name: orgNameRaw,
              chapter: chapter || null,
              website: orgWebsite || null,
            })
            .select("id")
            .single();
          orgId = created?.id;
        }
        if (orgId && userId) {
          await supabase
            .from("org_members")
            .insert({ org_id: orgId, user_id: userId, is_leader: true });
        }
      } catch (e) {
        console.error("org provisioning error", e);
      }
    }

    // Return updated totals
    const { data: totals } = await supabase
      .from("pledge_totals")
      .select("total_pledged_acts, total_commitments")
      .single();

    return new Response(
      JSON.stringify({
        id: data.id,
        total_pledged_acts: Number(totals?.total_pledged_acts ?? 0),
        total_commitments: Number(totals?.total_commitments ?? 0),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("submit-commitment error", e);
    return bad("Unexpected error", 500);
  }
});
