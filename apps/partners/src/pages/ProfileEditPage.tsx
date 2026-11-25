import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Loader2, Upload } from "lucide-react";
import Shell from "@/components/Shell";
import Avatar from "@/components/Avatar";
import { useHubCopy } from "@/lib/hubCopy";
import { uploadLogo, useMe, useSaveProfile, type ProfileInput } from "@/lib/hub";
import { orgTypeLabel, orgTypesFor } from "@/lib/kinds";
import { COUNTRY_NAMES, countryLabel } from "@/lib/geo";

/** Edit profile: logo, kind, where, a line about them, links, contact. One short form. */
export default function ProfileEditPage() {
  const { h, lang } = useHubCopy();
  const { data: me } = useMe();
  const save = useSaveProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ProfileInput | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (me && !form)
      setForm({
        city: me.city ?? "",
        country: me.country ?? "",
        region: me.region ?? "",
        orgType: me.orgType ?? orgTypesFor(me.kind)[0],
        website: me.website ?? "",
        instagram: me.instagram ?? "",
        facebook: me.facebook ?? "",
        linkedin: me.linkedin ?? "",
        about: me.about ?? "",
        contactName: me.contactName ?? "",
      });
  }, [me, form]);

  if (!me || !form) return <Shell>{<div className="h-72 animate-pulse bg-tint-sky/60" />}</Shell>;

  const set = (k: keyof ProfileInput) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const types = orgTypesFor(me.kind);
  const countries = [...COUNTRY_NAMES].sort((a, b) => countryLabel(a, lang).localeCompare(countryLabel(b, lang), lang));

  async function pickLogo(file: File) {
    setError(null);
    setUploading(true);
    try {
      const path = await uploadLogo(file, me!.id);
      setForm((f) => (f ? { ...f, logoPath: path } : f));
      setLogoPreview(URL.createObjectURL(file));
    } catch (e) {
      setError(e instanceof Error ? e.message : h.somethingWrong);
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setError(null);
    try {
      await save.mutateAsync(form!);
      setDone(true);
      setTimeout(() => navigate("/me"), 700);
    } catch (e) {
      setError(e instanceof Error ? e.message : h.somethingWrong);
    }
  }

  const field = "flex flex-col gap-1.5";
  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2">
          <Link to="/me" className="-ms-2 flex h-10 w-10 items-center justify-center text-navy hover:bg-tint-sky" aria-label={h.me}>
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Link>
          <h1 className="m-0 text-xl font-extrabold">{h.editProfile}</h1>
        </div>

        <div className="flex items-center gap-4">
          {logoPreview ? (
            <span className="flex h-[84px] w-[84px] items-center justify-center border-[1.5px] border-hair bg-white">
              <img src={logoPreview} alt="" className="h-full w-full object-contain p-2" />
            </span>
          ) : (
            <Avatar name={me.name} url={form.logoPath === "" ? null : me.logoUrl} kind={me.kind} size={84} />
          )}
          <div className="flex flex-col gap-1.5">
            <span className="text-lg font-extrabold leading-tight">{me.name}</span>
            <span className="text-[12.5px] font-semibold text-ink-faint">{h.nameFixed}</span>
            <div className="flex gap-3">
              <button type="button" onClick={() => fileRef.current?.click()} className="btn-quiet" disabled={uploading}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
                {me.logoUrl || logoPreview ? h.changeLogo : h.addLogo}
              </button>
              {(me.logoPath || logoPreview) && (
                <button type="button" onClick={() => (setForm({ ...form, logoPath: "" }), setLogoPreview(null))} className="text-sm font-bold text-ink-faint hover:text-rose-ink">
                  {h.removeLogo}
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => e.target.files?.[0] && pickLogo(e.target.files[0])} />
          </div>
        </div>

        {types.length > 1 && (
          <label className={field} htmlFor="p-type">
            <span className="label">{h.kindLabel}</span>
            <select id="p-type" className="field" value={form.orgType} onChange={set("orgType")}>
              {types.map((t) => (
                <option key={t} value={t}>
                  {orgTypeLabel(t, lang)}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className={field} htmlFor="p-country">
          <span className="label">{h.country}</span>
          <select id="p-country" className="field" value={form.country} onChange={set("country")}>
            <option value="">{h.pickCountry}</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {countryLabel(c, lang)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={field} htmlFor="p-region">
            <span className="label">{h.region}</span>
            <input id="p-region" className="field" maxLength={120} value={form.region} onChange={set("region")} />
          </label>
          <label className={field} htmlFor="p-city">
            <span className="label">{h.city}</span>
            <input id="p-city" className="field" maxLength={120} value={form.city} onChange={set("city")} />
          </label>
        </div>

        <label className={field} htmlFor="p-about">
          <span className="label">{h.about}</span>
          <textarea id="p-about" className="textarea" rows={3} maxLength={600} placeholder={h.aboutPlaceholder} value={form.about} onChange={set("about")} />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className={field} htmlFor="p-web">
            <span className="label">{h.website}</span>
            <input id="p-web" className="field" inputMode="url" placeholder="yourwebsite.org" value={form.website} onChange={set("website")} />
          </label>
          <label className={field} htmlFor="p-ig">
            <span className="label">Instagram</span>
            <input id="p-ig" className="field" placeholder="@handle" value={form.instagram} onChange={set("instagram")} />
          </label>
          <label className={field} htmlFor="p-fb">
            <span className="label">Facebook</span>
            <input id="p-fb" className="field" value={form.facebook} onChange={set("facebook")} />
          </label>
          <label className={field} htmlFor="p-li">
            <span className="label">LinkedIn</span>
            <input id="p-li" className="field" value={form.linkedin} onChange={set("linkedin")} />
          </label>
        </div>

        {me.kind !== "ambassador" && (
          <label className={field} htmlFor="p-contact">
            <span className="label">{h.contactName}</span>
            <input id="p-contact" className="field" maxLength={120} value={form.contactName} onChange={set("contactName")} />
          </label>
        )}

        {error && <p className="m-0 bg-rose-soft px-3 py-2 text-sm font-semibold text-rose-ink">{error}</p>}

        <button type="button" onClick={submit} disabled={save.isPending || uploading} className="btn-orange h-12 text-base">
          {done ? <Check className="h-5 w-5" aria-hidden="true" /> : save.isPending ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : null}
          {done ? h.saved : save.isPending ? h.saving : h.save}
        </button>
      </div>
    </Shell>
  );
}
