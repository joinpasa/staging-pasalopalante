import { useEffect, useMemo, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature } from "topojson-client";
import { geoCentroid } from "d3-geo";
import { atlasName, jitter, SMALL_COUNTRIES } from "@/lib/geo";
import { kindOf, KIND_COLOR } from "@/lib/kinds";
import type { MapMember } from "@/lib/hub";

export type MapMode = "members" | "pledgers";

interface Topology {
  type: "Topology";
  objects: { countries: unknown };
}
interface CountryShape {
  rsmKey: string;
  properties: { name: string };
}
interface CountryFeature {
  properties: { name: string };
}

export interface MapPick {
  title: string;
  sub: string;
}

/** The world, drawn from the website's own country shapes (no outside map service). */
export default function WorldMap({
  mode,
  members,
  pledgers,
  myId,
  pulse = null,
  onPick,
  describeMember,
  describeCountry,
}: {
  mode: MapMode;
  /** a country to ring softly: where the newest pledge came from */
  pulse?: string | null;
  members: MapMember[];
  pledgers: { country: string; people: number }[];
  myId?: string;
  onPick: (p: MapPick | null) => void;
  describeMember: (m: MapMember) => MapPick;
  describeCountry: (country: string, people: number) => MapPick;
}) {
  const [topo, setTopo] = useState<Topology | null>(null);
  useEffect(() => {
    import("world-atlas/countries-110m.json").then((m) => setTopo(m.default as unknown as Topology));
  }, []);

  const centroids = useMemo(() => {
    const map = new Map<string, [number, number]>();
    if (!topo) return map;
    const fc = feature(topo, topo.objects.countries) as unknown as { features: CountryFeature[] };
    for (const f of fc.features) map.set(f.properties.name, geoCentroid(f) as [number, number]);
    // a few centroids that land in the sea or far from where people live
    map.set("United States of America", [-98, 39]);
    map.set("France", [2.4, 46.6]);
    map.set("Norway", [9, 61]);
    map.set("Canada", [-100, 56]);
    map.set("Russia", [60, 58]);
    return map;
  }, [topo]);

  const point = (country: string | null): [number, number] | null => {
    if (!country) return null;
    return SMALL_COUNTRIES[country] ?? centroids.get(atlasName(country)) ?? null;
  };

  const peopleByAtlas = useMemo(() => new Map(pledgers.map((p) => [atlasName(p.country), p.people])), [pledgers]);
  const memberCountries = useMemo(() => new Set(members.filter((m) => m.country).map((m) => atlasName(m.country!))), [members]);
  const max = Math.max(1, ...pledgers.map((p) => p.people));

  const fill = (name: string) => {
    if (mode === "pledgers") {
      const n = peopleByAtlas.get(name) ?? 0;
      if (!n) return "#eef3f7";
      const t = Math.sqrt(n / max);
      return t > 0.66 ? "#33b5e8" : t > 0.4 ? "#7fd0ef" : t > 0.2 ? "#b3e3f6" : "#d6f0fb";
    }
    return memberCountries.has(name) ? "#d6f0fb" : "#eef3f7";
  };

  return (
    <div className="relative w-full bg-[#f9fcfe]">
      <ComposableMap projection="geoEqualEarth" projectionConfig={{ scale: 165, center: [10, 8] }} width={900} height={440} style={{ width: "100%", height: "auto" }}>
        {topo && (
          <Geographies geography={topo}>
            {({ geographies }: { geographies: CountryShape[] }) =>
              geographies
                .filter((g) => g.properties.name !== "Antarctica")
                .map((g) => (
                  <Geography
                    key={g.rsmKey}
                    geography={g}
                    fill={fill(g.properties.name)}
                    stroke="#ffffff"
                    strokeWidth={0.6}
                    style={{ default: { outline: "none" }, hover: { outline: "none", fill: "#a6def4" }, pressed: { outline: "none" } }}
                    onClick={() => {
                      const n = peopleByAtlas.get(g.properties.name);
                      onPick(n ? describeCountry(pledgers.find((p) => atlasName(p.country) === g.properties.name)?.country ?? g.properties.name, n) : null);
                    }}
                  />
                ))
            }
          </Geographies>
        )}

        {topo &&
          mode === "pledgers" &&
          pledgers.map((p) => {
            const at = point(p.country);
            if (!at) return null;
            const r = 2.5 + Math.sqrt(p.people / max) * 13;
            return (
              <Marker key={p.country} coordinates={at} onClick={() => onPick(describeCountry(p.country, p.people))}>
                <circle r={r} fill="#00a3e0" fillOpacity={0.55} stroke="#ffffff" strokeWidth={1.2} style={{ cursor: "pointer" }} />
              </Marker>
            );
          })}

        {topo &&
          mode === "members" &&
          members.map((m) => {
            const base = point(m.country);
            if (!base) return null;
            const [dx, dy] = jitter(m.id, members.filter((x) => x.country === m.country).length > 1 ? 3 : 0);
            const mine = m.id === myId;
            const s = mine ? 13 : 8;
            const color = KIND_COLOR[kindOf(m.orgType)];
            return (
              <Marker key={m.id} coordinates={[base[0] + dx, base[1] + dy]} onClick={() => onPick(describeMember(m))}>
                {mine && <rect x={-s / 2 - 4} y={-s / 2 - 4} width={s + 8} height={s + 8} fill="#ffffff" stroke="#f37023" strokeWidth={2} />}
                <rect x={-s / 2} y={-s / 2} width={s} height={s} fill={mine ? "#f37023" : color} stroke="#ffffff" strokeWidth={1.2} style={{ cursor: "pointer" }} />
              </Marker>
            );
          })}
        {topo &&
          pulse &&
          (() => {
            const at = point(pulse);
            if (!at) return null;
            return (
              <Marker key={`pulse-${pulse}`} coordinates={at}>
                <circle r={6} fill="#d81b60" />
                <circle r={6} fill="none" stroke="#d81b60" strokeWidth={2}>
                  <animate attributeName="r" from="6" to="26" dur="1.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.8" to="0" dur="1.6s" repeatCount="indefinite" />
                </circle>
              </Marker>
            );
          })()}
      </ComposableMap>
      {!topo && <div className="absolute inset-0 animate-pulse bg-tint-sky/50" />}
    </div>
  );
}
