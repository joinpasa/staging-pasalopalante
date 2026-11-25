import { useHubCopy } from "@/lib/hubCopy";

export interface ConsentState {
  share: boolean;
  people: boolean;
  minors: boolean;
}

export const NO_CONSENT: ConsentState = { share: false, people: false, minors: false };

/** The two boxes every post and story carries, worded once for the whole hub. */
export default function Consent({ value, onChange, hasMedia, id }: { value: ConsentState; onChange: (v: ConsentState) => void; hasMedia: boolean; id: string }) {
  const { h } = useHubCopy();
  const box = "mt-0.5 h-[18px] w-[18px] shrink-0 accent-[#f37023]";
  return (
    <div className="flex flex-col gap-2.5 bg-tint-gold px-4 py-3.5">
      <label className="flex gap-3 text-[13.5px] font-semibold leading-snug text-ink2" htmlFor={`${id}-share`}>
        <input id={`${id}-share`} type="checkbox" className={box} checked={value.share} onChange={(e) => onChange({ ...value, share: e.target.checked })} />
        <span>{h.consentShare}</span>
      </label>
      {hasMedia && (
        <>
          <label className="flex gap-3 text-[13.5px] font-semibold leading-snug text-ink2" htmlFor={`${id}-people`}>
            <input id={`${id}-people`} type="checkbox" className={box} checked={value.people} onChange={(e) => onChange({ ...value, people: e.target.checked })} />
            <span>{h.consentPeople}</span>
          </label>
          <label className="flex gap-3 ps-[30px] text-[13px] font-semibold text-ink-muted" htmlFor={`${id}-minors`}>
            <input id={`${id}-minors`} type="checkbox" className="h-4 w-4 shrink-0 accent-[#f37023]" checked={value.minors} onChange={(e) => onChange({ ...value, minors: e.target.checked })} />
            <span>{h.showsMinors}</span>
          </label>
        </>
      )}
    </div>
  );
}

/** What's missing before it can be sent, or null. */
export function consentProblem(value: ConsentState, hasMedia: boolean, h: { needShare: string; needPeople: string }) {
  if (!value.share) return h.needShare;
  if (hasMedia && !value.people) return h.needPeople;
  return null;
}
