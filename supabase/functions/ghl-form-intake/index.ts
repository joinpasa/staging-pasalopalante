/**
 * GHL Form Intake
 * GoHighLevel-embedded website forms → Airtable (PPL CRM)
 *
 * The /get-involved/* pages embed GoHighLevel forms directly (GHLFormEmbed),
 * so those submissions go straight to GHL and never pass through ppl-signup.
 * A GHL Workflow ("Form Submitted" trigger → "Webhook" action) POSTs each
 * submission here, and this writes it to the same two Airtable tables
 * ppl-signup uses: a PPL Signups row (raw intake) plus an upserted
 * PPL Contacts row (one per email).
 *
 * Which form it was is read from the `form` query param on the webhook URL
 * (e.g. .../ghl-form-intake?form=schools) — one GHL workflow per form keeps
 * this unambiguous. A `form` / `form_name` key in the body also works.
 *
 * Auth: GHL sends a shared secret in the `x-intake-secret` header, compared
 * against the GHL_INTAKE_SECRET function secret. Requests without it are
 * rejected, so the public URL can't be used to write junk into Airtable.
 *
 * Writes only to existing select options (no typecast), so it never depends
 * on schema-edit permission: Form Source is always "Get Involved", and the
 * specific form name goes in Notes.
 */

const AIRTABLE = {
  apiKey: Deno.env.get("AIRTABLE_API_KEY"),
  baseId: "appbKxCqfjdLn7azB",
  signupsTableId: "tblkK1638c4l3LqbV",
  contactsTableId: "tblzYOQLjXO8qZzqy",
};
const INTAKE_SECRET = Deno.env.get("GHL_INTAKE_SECRET");

const SIGNUP = {
  fullName: "fldXdVvZOC9FVkKvA",
  email: "fldpts0YHcLLszwKE",
  phone: "fld0QTqU34I3ClY5Y",
  country: "fldfBHwBpr8IVUZ8J",
  city: "fldBw1pJX4Tu2RskB",
  organization: "fldD7Q7iiI6mIhL40",
  participantType: "fldNKlDWu7YmtQ8fN",
  formSource: "fldT6VuQjD1cfYaS7",
  message: "fldnlezj8HmxfqsXm",
  signupDate: "fld77ci08n9sw33yx",
  status: "fldK9rwVob4gMejDk",
  ghlContactId: "fldrXJVK899ClCIHD",
  ghlSynced: "fldcKfzUVK3qwEFnj",
  notes: "fldLWgEEqty2A6f6h",
};

const CONTACT = {
  fullName: "fldQwx694OD3gkxGm",
  email: "fldiofrRiAdIkopTX",
  phone: "fldksHKz7ECoj1RM4",
  country: "fldQgWoxD3KIUTLlC",
  city: "fldOrPJvWUyuRpbwj",
  organization: "fldJ0q3UU79jOsmOi",
  contactType: "fldpX7vP5icQVNq9c",
  crmStage: "fldJMbOhjFQOnA6LC",
  firstContactDate: "fldfm7a69XiUobg23",
  lastActivityDate: "fldBny4V28Q1DwUWB",
  ghlContactId: "fld3lDVJQ2WHckcMk",
  ghlSynced: "fldqxtKJALV9t4o3A",
  emailOptIn: "fldJmx7kex0xNLgcQ",
  tags: "fldEHFb0xo78DjEVJ",
  notes: "fldoUD9ay225whZ9O",
  source: "fldJdpItFmlMcRjM0",
};

// form key → label for Notes + an existing Participant Type option.
const FORMS: Record<string, { label: string; participantType: string }> = {
  schools: { label: "Schools & Educators", participantType: "School" },
  nonprofits: { label: "Nonprofits & Faith", participantType: "Nonprofit" },
  ambassadors: { label: "Ambassadors", participantType: "Ambassador" },
  municipalities: { label: "Municipalities", participantType: "Municipality" },
  companies: { label: "Companies", participantType: "Company" },
  partners: { label: "Partners", participantType: "Partner" },
};

// Keys GHL includes in every workflow webhook that aren't form answers.
const NOISE_KEYS = new Set([
  "contact_id", "id", "first_name", "last_name", "full_name", "name", "email",
  "phone", "country", "city", "state", "postal_code", "address1", "company_name",
  "tags", "contact_source", "contact_type", "date_created", "full_address",
  "location", "workflow", "triggerData", "contact", "attributionSource",
  "user", "form", "form_name", "formName", "timezone", "customData", "intake_secret",
]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  // Secret comes from the x-intake-secret header (GHL "Custom Webhook" action)
  // or an `intake_secret` Custom Data key (GHL's standard "Webhook" action,
  // which can't set headers).
  const sentSecret = req.headers.get("x-intake-secret") ??
    asRecord(body.customData).intake_secret ?? body.intake_secret;
  if (!INTAKE_SECRET || sentSecret !== INTAKE_SECRET) {
    return json({ error: "Unauthorized" }, 401);
  }
  if (!AIRTABLE.apiKey) {
    console.error("AIRTABLE_API_KEY is not set");
    return json({ error: "Airtable not configured" }, 500);
  }

  // GHL nests things differently depending on webhook type — flatten the
  // places contact fields and custom data commonly show up.
  const custom = asRecord(body.customData);
  const contact = asRecord(body.contact);
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      for (const src of [custom, body, contact]) {
        const v = src[k];
        if (typeof v === "string" && v.trim()) return v.trim();
      }
    }
    return "";
  };

  const email = pick("email").toLowerCase();
  if (!email) return json({ error: "Email is required" }, 400);

  const url = new URL(req.url);
  const formKey = (url.searchParams.get("form") || pick("form", "form_name", "formName"))
    .toLowerCase().replace(/[^a-z]/g, "");
  const form = FORMS[formKey] ?? { label: formKey || "Unknown GHL form", participantType: "Individual" };

  const fullName = pick("full_name", "name") ||
    [pick("first_name"), pick("last_name")].filter(Boolean).join(" ");
  const phone = pick("phone");
  const country = pick("country");
  const city = pick("city");
  const organization = pick("company_name", "organization", "organization_name");
  const ghlContactId = pick("contact_id", "id");

  // Everything else the form collected → readable "Question: answer" lines.
  const extras: string[] = [];
  for (const [k, v] of Object.entries({ ...body, ...custom })) {
    if (NOISE_KEYS.has(k) || v === null || v === "" || typeof v === "object") continue;
    extras.push(`${k}: ${String(v)}`);
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const noteLine = `GHL form: ${form.label} (via ghl-form-intake)`;

  let signupId: string | null = null;
  try {
    const rec = await airtable("POST", AIRTABLE.signupsTableId, {
      fields: {
        [SIGNUP.fullName]: fullName,
        [SIGNUP.email]: email,
        [SIGNUP.phone]: phone,
        [SIGNUP.country]: country,
        [SIGNUP.city]: city,
        [SIGNUP.organization]: organization,
        [SIGNUP.participantType]: form.participantType,
        [SIGNUP.formSource]: "Get Involved",
        [SIGNUP.message]: extras.join("\n"),
        [SIGNUP.signupDate]: now,
        [SIGNUP.status]: "New",
        [SIGNUP.ghlContactId]: ghlContactId,
        [SIGNUP.ghlSynced]: !!ghlContactId,
        [SIGNUP.notes]: noteLine,
      },
    });
    signupId = rec.id;
  } catch (err) {
    console.error("Airtable signup create failed:", err);
    return json({ error: "Airtable signup create failed", detail: (err as Error).message }, 502);
  }

  let contactId: string | null = null;
  try {
    const formula = encodeURIComponent(`LOWER({Email})="${email.replace(/"/g, '\\"')}"`);
    const found = await airtable("GET", `${AIRTABLE.contactsTableId}?maxRecords=1&returnFieldsByFieldId=true&filterByFormula=${formula}`);
    const existing = found.records?.[0];

    if (existing) {
      const types = new Set<string>(existing.fields?.[CONTACT.contactType] ?? []);
      types.add(form.participantType);
      const update: Record<string, unknown> = {
        [CONTACT.lastActivityDate]: today,
        [CONTACT.crmStage]: "Engaged",
        [CONTACT.contactType]: [...types],
      };
      if (ghlContactId) {
        update[CONTACT.ghlContactId] = ghlContactId;
        update[CONTACT.ghlSynced] = true;
      }
      if (organization && !existing.fields?.[CONTACT.organization]) update[CONTACT.organization] = organization;
      await airtable("PATCH", `${AIRTABLE.contactsTableId}/${existing.id}`, { fields: update });
      contactId = existing.id;
    } else {
      const rec = await airtable("POST", AIRTABLE.contactsTableId, {
        fields: {
          [CONTACT.fullName]: fullName,
          [CONTACT.email]: email,
          [CONTACT.phone]: phone,
          [CONTACT.country]: country,
          [CONTACT.city]: city,
          [CONTACT.organization]: organization,
          [CONTACT.contactType]: [form.participantType],
          [CONTACT.crmStage]: "Lead",
          [CONTACT.firstContactDate]: today,
          [CONTACT.lastActivityDate]: today,
          [CONTACT.ghlContactId]: ghlContactId,
          [CONTACT.ghlSynced]: !!ghlContactId,
          [CONTACT.emailOptIn]: true,
          [CONTACT.tags]: ["PPL2026"],
          [CONTACT.source]: "PPL Website",
          [CONTACT.notes]: noteLine,
        },
      });
      contactId = rec.id;
    }

    await airtable("PATCH", `${AIRTABLE.signupsTableId}/${signupId}`, {
      fields: { [SIGNUP.status]: "Converted to Contact" },
    });
  } catch (err) {
    // The signup row is already saved; a contact failure shouldn't make GHL retry
    // and create a duplicate signup, so log and still return 200.
    console.error("Airtable contact upsert failed (non-fatal):", err);
  }

  return json({ success: true, form: formKey, signupId, contactId });
});

async function airtable(method: string, path: string, payload?: unknown) {
  const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE.baseId}/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${AIRTABLE.apiKey}`,
      "Content-Type": "application/json",
    },
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) throw new Error(`Airtable ${method} ${res.status}: ${await res.text()}`);
  return res.json();
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
