/**
 * PPL Integration Webhook
 * Pásalo Pa'lante — pasalopalante.com → Airtable → GoHighLevel
 *
 * Deploy as a Supabase Edge Function (since PPL site is on Lovable/Supabase)
 * File: supabase/functions/ppl-signup/index.ts
 *
 * BASE IDs (move to appoKneYE1Vgp8hhK once Te Amo PR invite is accepted)
 * Current:  appbKxCqfjdLn7azB  (PPL CRM — Sovereign Ops staging)
 * Target:   appoKneYE1Vgp8hhK  (Te Amo PR Live Truth)
 *
 * TABLE IDs
 * PPL Signups:  tblkK1638c4l3LqbV
 * PPL Contacts: tblzYOQLjXO8qZzqy
 */

// Public endpoint — no Supabase client needed

const CONFIG = {
  airtable: {
    apiKey: Deno.env.get("AIRTABLE_API_KEY"),
    baseId: "appbKxCqfjdLn7azB",
    signupsTableId: "tblkK1638c4l3LqbV",
    contactsTableId: "tblzYOQLjXO8qZzqy",
  },
  ghl: {
    apiKey: Deno.env.get("GHL_API_KEY"),
    locationId: Deno.env.get("GHL_LOCATION_ID"),
    baseUrl: "https://services.leadconnectorhq.com",
  },
};

const SIGNUP_FIELDS = {
  fullName:        "fldXdVvZOC9FVkKvA",
  email:           "fldpts0YHcLLszwKE",
  phone:           "fld0QTqU34I3ClY5Y",
  country:         "fldfBHwBpr8IVUZ8J",
  cityTown:        "fldBw1pJX4Tu2RskB",
  organization:    "fldD7Q7iiI6mIhL40",
  participantType: "fldNKlDWu7YmtQ8fN",
  formSource:      "fldT6VuQjD1cfYaS7",
  pledgeCount:     "fld7xsFM12Nb4FRbF",
  message:         "fldnlezj8HmxfqsXm",
  signupDate:      "fld77ci08n9sw33yx",
  status:          "fldK9rwVob4gMejDk",
  ghlContactId:    "fldrXJVK899ClCIHD",
  ghlSynced:       "fldcKfzUVK3qwEFnj",
  utmSource:       "fld7n4BJe4asG5BKe",
  utmMedium:       "fldx2WE1rv7zpfEW6",
  utmCampaign:     "fldiMVIYJUJkYu5lI",
  ipCountry:       "fldnt7b6LgzweYQfJ",
  notes:           "fldLWgEEqty2A6f6h",
};

const CONTACT_FIELDS = {
  fullName:         "fldQwx694OD3gkxGm",
  email:            "fldiofrRiAdIkopTX",
  phone:            "fldksHKz7ECoj1RM4",
  country:          "fldQgWoxD3KIUTLlC",
  cityTown:         "fldOrPJvWUyuRpbwj",
  organization:     "fldJ0q3UU79jOsmOi",
  contactType:      "fldpX7vP5icQVNq9c",
  crmStage:         "fldJMbOhjFQOnA6LC",
  totalPledges:     "fldlpIH6uNXdwZwdZ",
  firstContactDate: "fldfm7a69XiUobg23",
  lastActivityDate: "fldBny4V28Q1DwUWB",
  ghlContactId:     "fld3lDVJQ2WHckcMk",
  ghlSynced:        "fldqxtKJALV9t4o3A",
  emailOptIn:       "fldJmx7kex0xNLgcQ",
  smsOptIn:         "fldHBzYED1HJgQokF",
  ambassadorStatus: "fldrLAdJ6SNTngBtH",
  tags:             "fldEHFb0xo78DjEVJ",
  notes:            "fldoUD9ay225whZ9O",
  source:           "fldJdpItFmlMcRjM0",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // Public endpoint — no JWT required (form submissions from unauthenticated visitors)


  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const { formType, data } = body;
  if (!formType || !data) {
    return json({ error: "Missing formType or data" }, 400);
  }
  if (!data.email) {
    return json({ error: "Email is required" }, 400);
  }

  const now = new Date().toISOString();
  const today = now.split("T")[0];

  // Lifecycle milestones (password set, email verified): tag-only, GHL-only —
  // no Airtable signup record, and must not touch the contact's other tags.
  if (formType === "password-set" || formType === "email-verified") {
    try {
      const ghlContactId = await ghlAddTags(data.email, [formType], {
        firstName: data.firstName || "",
        lastName: data.lastName || "",
      });
      return json({ success: true, ghlContactId });
    } catch (err) {
      console.error(`${formType} GHL sync failed:`, err);
      return json({ error: "Integration failed", detail: (err as Error).message }, 500);
    }
  }

  // Course Creator form: GHL-only path (no Airtable field mapping yet).
  if (formType === "course-creator") {
    try {
      const ghlContactId = await ghlUpsertContact({
        firstName:   data.fullName?.split(" ")[0] || "",
        lastName:    data.fullName?.split(" ").slice(1).join(" ") || "",
        email:       data.email,
        phone:       data.phone || "",
        country:     data.country || "",
        city:        "",
        companyName: data.organization || "",
        tags:        ["PPL2026", "ppl-website", "course-creator", ...(Array.isArray(data.interests) ? data.interests.map((i: string) => `interest:${String(i).toLowerCase()}`) : [])],
        source:      "PPL Website — Course Creator",
        customFields: {
          social_media_handles: data.social || "",
          organization_name:    data.organization || "",
          areas_of_interest:    Array.isArray(data.interests) ? data.interests.join(", ") : "",
          capacity:             Array.isArray(data.capacity) ? data.capacity.join(", ") : "",
          capacity_details:     data.capacityDetails || "",
          organization_logo:    data.logoUrl || "",
          consent_values:       data.consentValues ? "yes" : "no",
          consent_comms:        data.consentComms ? "yes" : "no",
          focus_skillset:       data.focus || "",
          collective_network:   data.network || "",
          questions_feedback:   data.questions || "",
          form_source:          "course-creator",
          utm_source:           data.utm_source || "",
          utm_campaign:         data.utm_campaign || "",
        },
      });
      return json({ success: true, ghlContactId });
    } catch (err) {
      console.error("Course-creator GHL sync failed:", err);
      return json({ error: "Integration failed", detail: (err as Error).message }, 500);
    }
  }

  // Outbound webhook — fire-and-forget (non-fatal)
  await postAirtableWebhook({
    full_name:        data.fullName || null,
    email:            data.email || null,
    phone:            data.phone || null,
    country:          data.country || null,
    city:             data.city || null,
    organization:     data.organization || null,
    participant_type: data.participantType || null,
    form_source:      formSourceLabel(formType),
    pledge_count:     data.pledgeCount ? parseInt(data.pledgeCount) : 0,
    message:          data.message || null,
    signup_date:      now,
  });

  // Airtable and GHL are configured independently (you may have keys for
  // only one at a time), so each is its own non-fatal try/catch — a missing
  // or failing provider must never block the other, or the form submission
  // itself, which has already succeeded by this point.
  let signupRecordId: string | null = null;
  try {
    const signupRecord = await airtableCreate(
      CONFIG.airtable.signupsTableId,
      {
        [SIGNUP_FIELDS.fullName]:        data.fullName || "",
        [SIGNUP_FIELDS.email]:           data.email,
        [SIGNUP_FIELDS.phone]:           data.phone || "",
        [SIGNUP_FIELDS.country]:         data.country || "",
        [SIGNUP_FIELDS.cityTown]:        data.city || "",
        [SIGNUP_FIELDS.organization]:    data.organization || "",
        [SIGNUP_FIELDS.participantType]: data.participantType || "Individual",
        [SIGNUP_FIELDS.formSource]:      formSourceLabel(formType),
        [SIGNUP_FIELDS.pledgeCount]:     data.pledgeCount ? parseInt(data.pledgeCount) : null,
        [SIGNUP_FIELDS.message]:         data.message || "",
        [SIGNUP_FIELDS.signupDate]:      now,
        [SIGNUP_FIELDS.status]:          "New",
        [SIGNUP_FIELDS.utmSource]:       data.utm_source || "",
        [SIGNUP_FIELDS.utmMedium]:       data.utm_medium || "",
        [SIGNUP_FIELDS.utmCampaign]:     data.utm_campaign || "",
        [SIGNUP_FIELDS.ipCountry]:       data.ipCountry || "",
      }
    );
    signupRecordId = signupRecord.id;
  } catch (airtableError) {
    console.error("Airtable signup create failed (non-fatal):", airtableError);
  }

  let ghlContactId: string | null = null;
  try {
    ghlContactId = await ghlUpsertContact({
      firstName:    data.fullName?.split(" ")[0] || "",
      lastName:     data.fullName?.split(" ").slice(1).join(" ") || "",
      email:        data.email,
      phone:        data.phone || "",
      country:      data.country || "",
      city:         data.city || "",
      companyName:  data.organization || "",
      tags:         buildGHLTags(formType, data),
      source:       formType === "app-join" ? "PPL App" : "PPL Website",
      customFields: {
        participant_type: data.participantType || "Individual",
        pledge_count:     data.pledgeCount || "",
        form_source:      formType,
        utm_source:       data.utm_source || "",
        utm_campaign:     data.utm_campaign || "",
      },
    });
  } catch (ghlError) {
    console.error("GHL sync failed (non-fatal):", ghlError);
  }

  let contactRecordId: string | null = null;
  try {
    const contactRecord = await airtableUpsertContact({
      email:           data.email,
      fullName:        data.fullName || "",
      phone:           data.phone || "",
      country:         data.country || "",
      city:            data.city || "",
      organization:    data.organization || "",
      participantType: data.participantType || "Individual",
      pledgeCount:     data.pledgeCount ? parseInt(data.pledgeCount) : 0,
      today,
      ghlContactId,
      formType,
    });
    contactRecordId = contactRecord?.id || null;
  } catch (airtableError) {
    console.error("Airtable contact upsert failed (non-fatal):", airtableError);
  }

  if (ghlContactId && signupRecordId) {
    try {
      await airtableUpdate(CONFIG.airtable.signupsTableId, signupRecordId, {
        [SIGNUP_FIELDS.ghlContactId]: ghlContactId,
        [SIGNUP_FIELDS.ghlSynced]:    true,
        [SIGNUP_FIELDS.status]:       "Converted to Contact",
      });
    } catch (airtableError) {
      console.error("Airtable status update failed (non-fatal):", airtableError);
    }
  }

  return json({
    success: true,
    signupRecordId,
    contactRecordId,
    ghlContactId,
  });
});

const AIRTABLE_WEBHOOK_URL =
  "https://hooks.airtable.com/workflows/v1/genericWebhook/appbKxCqfjdLn7azB/wfl5bfvVtSX3IhpRQ/wtrF2FYdseZ2n3qBl";

async function postAirtableWebhook(payload: Record<string, unknown>) {
  try {
    const res = await fetch(AIRTABLE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error("Airtable webhook failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Airtable webhook error (non-fatal):", err);
  }
}

async function airtableCreate(tableId: string, fields: Record<string, unknown>) {
  const res = await fetch(
    `https://api.airtable.com/v0/${CONFIG.airtable.baseId}/${tableId}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${CONFIG.airtable.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable create failed: ${err}`);
  }
  return res.json();
}

async function airtableUpdate(tableId: string, recordId: string, fields: Record<string, unknown>) {
  const res = await fetch(
    `https://api.airtable.com/v0/${CONFIG.airtable.baseId}/${tableId}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${CONFIG.airtable.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fields }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable update failed: ${err}`);
  }
  return res.json();
}

async function airtableUpsertContact({ email, fullName, phone, country, city,
  organization, participantType, pledgeCount, today, ghlContactId, formType }: {
  email: string; fullName: string; phone: string; country: string; city: string;
  organization: string; participantType: string; pledgeCount: number; today: string;
  ghlContactId: string | null; formType: string;
}) {
  const searchRes = await fetch(
    `https://api.airtable.com/v0/${CONFIG.airtable.baseId}/${CONFIG.airtable.contactsTableId}` +
    `?filterByFormula=${encodeURIComponent(`{Email}="${email}"`)}`,
    { headers: { Authorization: `Bearer ${CONFIG.airtable.apiKey}` } }
  );
  const searchData = await searchRes.json();
  const existing = searchData.records?.[0];

  const tag = "PPL2026";

  if (existing) {
    const updatedFields: Record<string, unknown> = {
      [CONTACT_FIELDS.lastActivityDate]: today,
      [CONTACT_FIELDS.crmStage]:         "Engaged",
    };
    if (pledgeCount > 0) {
      updatedFields[CONTACT_FIELDS.totalPledges] =
        (existing.fields[CONTACT_FIELDS.totalPledges] || 0) + pledgeCount;
    }
    if (ghlContactId) {
      updatedFields[CONTACT_FIELDS.ghlContactId] = ghlContactId;
      updatedFields[CONTACT_FIELDS.ghlSynced]    = true;
    }
    return airtableUpdate(CONFIG.airtable.contactsTableId, existing.id, updatedFields);
  } else {
    return airtableCreate(CONFIG.airtable.contactsTableId, {
      [CONTACT_FIELDS.fullName]:         fullName,
      [CONTACT_FIELDS.email]:            email,
      [CONTACT_FIELDS.phone]:            phone,
      [CONTACT_FIELDS.country]:          country,
      [CONTACT_FIELDS.cityTown]:         city,
      [CONTACT_FIELDS.organization]:     organization,
      [CONTACT_FIELDS.contactType]:      [participantType],
      [CONTACT_FIELDS.crmStage]:         "Lead",
      [CONTACT_FIELDS.totalPledges]:     pledgeCount || 0,
      [CONTACT_FIELDS.firstContactDate]: today,
      [CONTACT_FIELDS.lastActivityDate]: today,
      [CONTACT_FIELDS.ghlContactId]:     ghlContactId || "",
      [CONTACT_FIELDS.ghlSynced]:        !!ghlContactId,
      [CONTACT_FIELDS.emailOptIn]:       true,
      [CONTACT_FIELDS.tags]:             [tag],
      [CONTACT_FIELDS.source]:           "PPL Website",
    });
  }
}

async function ghlUpsertContact(contact: {
  firstName: string; lastName: string; email: string; phone: string;
  country: string; city: string; companyName: string; tags: string[];
  source: string; customFields: Record<string, unknown>;
}) {
  const headers = {
    Authorization: `Bearer ${CONFIG.ghl.apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };

  const searchRes = await fetch(
    `${CONFIG.ghl.baseUrl}/contacts/search?email=${encodeURIComponent(contact.email)}&locationId=${CONFIG.ghl.locationId}`,
    { headers }
  );
  const searchData = await searchRes.json();
  const existing = searchData.contacts?.[0];

  const iso2 = toIso2(contact.country);

  const payload: Record<string, unknown> = {
    firstName:   contact.firstName,
    lastName:    contact.lastName,
    email:       contact.email,
    companyName: contact.companyName,
    source:      contact.source,
    locationId:  CONFIG.ghl.locationId,
    tags:        contact.tags,
    customFields: Object.entries(contact.customFields || {}).map(([key, value]) => ({
      key, field_value: String(value),
    })),
  };
  // GHL rejects empty/unknown values for these fields (422 "must be valid")
  if (contact.phone) payload.phone = contact.phone;
  if (contact.city) payload.city = contact.city;
  if (iso2) payload.country = iso2;

  if (existing) {
    const updateRes = await fetch(
      `${CONFIG.ghl.baseUrl}/contacts/${existing.id}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      }
    );
    if (!updateRes.ok) throw new Error(`GHL update failed: ${await updateRes.text()}`);
    return existing.id;
  } else {
    const createRes = await fetch(`${CONFIG.ghl.baseUrl}/contacts/`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!createRes.ok) throw new Error(`GHL create failed: ${await createRes.text()}`);
    const created = await createRes.json();
    return created.contact?.id;
  }
}

// Adds tags to an existing contact without touching its other tags or
// fields — unlike ghlUpsertContact, whose PUT replaces the entire tags
// array. Falls back to creating a bare contact with just these tags if no
// match is found, so a lifecycle event never gets silently dropped.
async function ghlAddTags(
  email: string,
  tags: string[],
  fallbackName: { firstName: string; lastName: string },
): Promise<string | undefined> {
  const headers = {
    Authorization: `Bearer ${CONFIG.ghl.apiKey}`,
    "Content-Type": "application/json",
    Version: "2021-07-28",
  };

  const searchRes = await fetch(
    `${CONFIG.ghl.baseUrl}/contacts/search?email=${encodeURIComponent(email)}&locationId=${CONFIG.ghl.locationId}`,
    { headers }
  );
  const searchData = await searchRes.json();
  const existing = searchData.contacts?.[0];

  if (!existing) {
    return ghlUpsertContact({
      ...fallbackName,
      email, phone: "", country: "", city: "", companyName: "",
      tags, source: "PPL App", customFields: {},
    });
  }

  const res = await fetch(`${CONFIG.ghl.baseUrl}/contacts/${existing.id}/tags`, {
    method: "POST",
    headers,
    body: JSON.stringify({ tags }),
  });
  if (!res.ok) throw new Error(`GHL add-tags failed: ${await res.text()}`);
  return existing.id;
}

// GHL expects an ISO 3166-1 alpha-2 country code. Map English country names to
// their code; return "" when unknown so the field is omitted from the payload.
let ISO2_BY_NAME: Record<string, string> | null = null;
function toIso2(input: string): string {
  const value = (input || "").trim();
  if (!value) return "";
  if (/^[A-Za-z]{2}$/.test(value)) return value.toUpperCase();
  if (!ISO2_BY_NAME) {
    ISO2_BY_NAME = {};
    try {
      const names = new Intl.DisplayNames(["en"], { type: "region" });
      for (let a = 65; a <= 90; a++) {
        for (let b = 65; b <= 90; b++) {
          const code = String.fromCharCode(a, b);
          const name = names.of(code);
          if (name && name !== code) ISO2_BY_NAME[name.toLowerCase()] = code;
        }
      }
    } catch { /* Intl unavailable — fall through */ }
  }
  return ISO2_BY_NAME[value.toLowerCase()] || "";
}

// Labels shown in Airtable's Signups/Contacts "Form Source" field. Keep in
// sync with buildGHLTags below — both exist so GHL automations and Airtable
// views can branch on exactly which surface a signup came from.
const FORM_SOURCE_LABELS: Record<string, string> = {
  pledge: "Pledge / Commit",
  "get-involved": "Get Involved",
  "app-join": "App Join",
  "website-signup": "Website Signup",
};

function formSourceLabel(formType: string): string {
  return FORM_SOURCE_LABELS[formType] ?? "Get Involved";
}

function buildGHLTags(formType: string, data: Record<string, string>) {
  const tags = ["PPL2026", formType === "app-join" ? "ppl-app" : "ppl-website"];
  if (formType === "pledge") tags.push("pledged");
  if (formType === "get-involved") tags.push("get-involved");
  if (formType === "app-join") tags.push("app-join");
  if (data.participantType) tags.push(data.participantType.toLowerCase().replace(" ", "-"));
  if (data.country === "Puerto Rico" || data.country === "PR") tags.push("puerto-rico");
  return tags;
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
