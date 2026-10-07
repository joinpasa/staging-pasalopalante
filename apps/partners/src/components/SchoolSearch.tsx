import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Search } from "lucide-react";
import { portal } from "@/lib/portalClient";
import { useCopy } from "@/lib/i18n";
import type { Partner } from "@/lib/session";

interface Props {
  value: Partner | null;
  onChange: (p: Partner | null) => void;
}

function Highlight({ text, q }: { text: string; q: string }) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-sky-deep">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}

/** Type-ahead combobox over partners (search_partners RPC, public). */
export default function SchoolSearch({ value, onChange }: Props) {
  const { t } = useCopy();
  const listId = useId();
  const [query, setQuery] = useState(value?.name ?? "");
  const [results, setResults] = useState<Partner[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [searched, setSearched] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (value && q === value.name) return;
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    const id = setTimeout(async () => {
      const { data } = await portal.rpc("search_partners", { _q: q });
      setResults((data ?? []) as Partner[]);
      setActive(0);
      setSearched(true);
    }, 200);
    return () => clearTimeout(id);
  }, [query, value]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const pick = (p: Partner) => {
    onChange(p);
    setQuery(p.name);
    setOpen(false);
  };

  const showList = open && query.trim().length >= 2 && !(value && query === value.name) && searched;

  return (
    <div className="relative flex flex-col gap-2" ref={wrapRef}>
      <label htmlFor="school" className="label">
        {t.school}
      </label>
      <div className="relative flex items-center">
        <Search className="pointer-events-none absolute start-3.5 h-5 w-5 text-ink-muted" aria-hidden="true" />
        <input
          id="school"
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
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
          onKeyDown={(e) => {
            if (!showList) return;
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, results.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            } else if (e.key === "Enter" && results[active]) {
              e.preventDefault();
              pick(results[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          className="field px-11"
        />
        {showList ? (
          <ChevronUp className="pointer-events-none absolute end-3.5 h-5 w-5 text-ink-muted" aria-hidden="true" />
        ) : (
          <ChevronDown className="pointer-events-none absolute end-3.5 h-5 w-5 text-ink-muted" aria-hidden="true" />
        )}
      </div>
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={t.school}
          className="absolute inset-x-0 top-[88px] z-20 m-0 flex list-none flex-col gap-0.5 rounded-[14px] border border-line-soft bg-white p-2 shadow-[0_16px_40px_rgba(14,35,75,0.16)]"
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
                <Highlight text={p.name} q={query.trim()} />
              </span>
              {p.city && <span className="text-[13px] text-ink-muted">{p.city}</span>}
            </li>
          ))}
          {results.length === 0 && <li className="px-3.5 py-3 text-sm text-ink-muted">{t.noSchoolMatch}</li>}
          <li className="mt-1 border-t border-line-faint px-3.5 pb-1.5 pt-2.5 text-[13px] text-ink-muted">
            {t.cantFindSchool}{" "}
            <a href="https://pasalopalante.com/contact" className="font-bold text-sky-deep no-underline">
              {t.contactUs}
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
