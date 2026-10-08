import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { portal } from "@/lib/portalClient";
import { useCopy } from "@/lib/i18n";
import { openSupportChat } from "@/lib/supportChat";
import type { Partner } from "@/lib/session";

interface Props {
  value: Partner | null;
  onChange: (p: Partner | null) => void;
}

const CACHE_KEY = "ppl-partner-orgs";
const MAX_SHOWN = 50;

function readCache(): Partner[] {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]") as Partner[];
  } catch {
    return [];
  }
}

/** Accent/case-insensitive: "esperanza" matches "Esperanza", "pon" matches "Ponce". */
function fold(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? fold(text).indexOf(fold(q)) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-sky-deep">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Organization picker. Loads the whole (small) list once and filters it in
 * the browser, so it opens and narrows instantly — a server round trip per
 * keystroke was taking seconds on the live site. The last list is kept in
 * localStorage so it's there immediately on the next visit, then refreshed.
 */
export default function SchoolSearch({ value, onChange }: Props) {
  const { t } = useCopy();
  const listId = useId();
  const [all, setAll] = useState<Partner[]>(readCache);
  const [loaded, setLoaded] = useState(() => readCache().length > 0);
  const [query, setQuery] = useState(value?.name ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    portal.rpc("list_partners").then(({ data, error }) => {
      // An empty answer (blip, or before any partner exists) never wipes a good saved list.
      if (cancelled || error || !data?.length) return;
      setAll(data as Partner[]);
      setLoaded(true);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        /* non-fatal */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // Once one is picked, typing its exact name shouldn't re-filter to just itself.
  const q = value && query === value.name ? "" : query.trim();
  const results = useMemo(() => {
    const f = fold(q);
    const hits = f ? all.filter((p) => fold(p.name).includes(f) || fold(p.city ?? "").includes(f)) : all;
    return hits.slice(0, MAX_SHOWN);
  }, [all, q]);

  useEffect(() => setActive(0), [q]);

  const pick = (p: Partner) => {
    onChange(p);
    setQuery(p.name);
    setOpen(false);
  };

  return (
    <div className="relative flex flex-col gap-2" ref={wrapRef}>
      <label htmlFor="school" className="label">
        {t.school}
      </label>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute start-3.5 h-5 w-5 text-ink-muted" aria-hidden="true" />
        <input
          ref={inputRef}
          id="school"
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          placeholder={t.searchSchool}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (value) onChange(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && open && results[active]) {
              e.preventDefault();
              pick(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="field px-11"
        />
        <button
          type="button"
          tabIndex={-1}
          aria-label={t.school}
          onClick={() => {
            setOpen((o) => !o);
            inputRef.current?.focus();
          }}
          className="absolute end-1.5 flex h-10 w-10 items-center justify-center text-ink-muted"
        >
          {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.school}
          className="absolute inset-x-0 top-[88px] z-20 m-0 flex max-h-[320px] list-none flex-col gap-0.5 overflow-y-auto rounded-[14px] border border-line-soft bg-white p-2 shadow-[0_16px_40px_rgba(14,35,75,0.16)]"
        >
          {results.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(p);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-[10px] px-3.5 py-3 ${i === active ? "bg-sky-wash" : ""}`}
            >
              <span className="text-[15px] font-semibold">
                <Highlight text={p.name} q={q} />
              </span>
              {p.city && <span className="text-[13px] text-ink-muted">{p.city}</span>}
            </li>
          ))}
          {results.length === 0 && (
            <li className="px-3.5 py-3 text-sm text-ink-muted">{loaded ? t.noSchoolMatch : t.loadingOrgs}</li>
          )}
          <li className="mt-1 border-t border-line-faint px-3.5 pb-1.5 pt-2.5 text-[13px] text-ink-muted">
            {t.cantFindSchool}{" "}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setOpen(false);
                openSupportChat();
              }}
              className="font-bold text-sky-deep"
            >
              {t.contactUs}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
