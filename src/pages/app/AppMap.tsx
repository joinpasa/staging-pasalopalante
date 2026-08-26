import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Loader2, LocateFixed, Minus, Plus, Search } from "lucide-react";
import { useKindnessMapCounts, useMovementTotals, useWallActs } from "@/hooks/useAppData";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const MIN_ZOOM = 1;
const MAX_ZOOM = 40;
const LOCAL_ZOOM = 12;
const RADIUS_MILES = 100;

const nf = new Intl.NumberFormat("en-US");

const NAME_ALIASES: Record<string, string> = {
  "united states of america": "united states",
  usa: "united states",
  "russian federation": "russia",
  "republic of korea": "south korea",
  "united kingdom of great britain and northern ireland": "united kingdom",
  "czech republic": "czechia",
  "dominican rep.": "dominican republic",
  "bosnia and herz.": "bosnia and herzegovina",
  "dem. rep. congo": "democratic republic of the congo",
  "cote d'ivoire": "côte d'ivoire",
  "ivory coast": "côte d'ivoire",
  "cape verde": "cabo verde",
  burma: "myanmar",
};

const normalize = (name: string) => {
  const key = name.trim().toLowerCase();
  return NAME_ALIASES[key] ?? key;
};

type Point = { country: string; coordinates: [number, number]; acts: number; commitments: number };

const timeAgo = (iso: string) => {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
};

export default function AppMap() {
  const { data: totals } = useMovementTotals();
  const { data: rows = [], isLoading } = useKindnessMapCounts();
  const { data: acts = [] } = useWallActs(8);

  const [centroids, setCentroids] = useState<Record<string, [number, number]>>({});
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Point | null>(null);
  const requested = useRef(false);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocError("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude];
        setUserLoc(coords);
        setCenter(coords);
        setZoom(LOCAL_ZOOM);
        setLocating(false);
      },
      () => {
        setLocError("Location off — showing the whole world.");
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const points = useMemo<Point[]>(
    () =>
      rows
        .map((r) => {
          const coords = centroids[normalize(r.country)];
          return coords
            ? { country: r.country, coordinates: coords, acts: r.acts, commitments: r.commitments }
            : null;
        })
        .filter(Boolean) as Point[],
    [rows, centroids],
  );

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return points.filter((p) => p.country.toLowerCase().includes(q)).slice(0, 5);
  }, [query, points]);

  const radiusDeg = (RADIUS_MILES / 69) * 2.2;

  return (
    <div className="relative flex flex-1 flex-col">
      <div className="px-5 pt-5">
        <div className="rounded-2xl bg-app-surface/95 p-4 shadow-sm backdrop-blur">
          <p className="font-sans text-2xl font-extrabold leading-none text-foreground">
            {nf.format(totals?.actsToday ?? 0)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">acts of kindness today, worldwide</p>
        </div>

        <div className="relative mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a country"
              aria-label="Search a country"
              className="w-full rounded-full border border-border bg-app-surface ps-9 pe-3 py-2.5 text-sm text-foreground outline-none focus:border-app-coral"
            />
            {suggestions.length > 0 && (
              <ul className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-border bg-app-surface shadow-lg">
                {suggestions.map((s) => (
                  <li key={s.country}>
                    <button
                      onClick={() => {
                        setCenter(s.coordinates);
                        setZoom(6);
                        setActive(s);
                        setQuery("");
                      }}
                      className="w-full px-4 py-2.5 text-start text-sm text-foreground"
                    >
                      {s.country}
                      <span className="text-muted-foreground"> · {s.acts + s.commitments}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button
            onClick={locate}
            aria-label="Use my location"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-surface text-app-teal shadow-sm"
          >
            {locating ? <Loader2 size={17} className="animate-spin" /> : <LocateFixed size={17} />}
          </button>
        </div>
        {locError && <p className="mt-2 text-xs text-muted-foreground">{locError}</p>}
      </div>

      {/* Live world map */}
      <div className="relative mx-5 mt-3 h-[46vh] shrink-0 overflow-hidden rounded-2xl bg-app-water">
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 110 }}
          style={{ width: "100%", height: "100%" }}
        >
          <ZoomableGroup
            center={center}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            onMoveEnd={({ coordinates, zoom: z }) => {
              setCenter(coordinates as [number, number]);
              setZoom(z);
            }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) => {
                if (Object.keys(centroids).length === 0 && geographies.length > 0) {
                  const next: Record<string, [number, number]> = {};
                  geographies.forEach((geo) => {
                    const name = geo.properties?.name ?? geo.properties?.NAME;
                    if (name) next[normalize(String(name))] = geoCentroid(geo) as [number, number];
                  });
                  setTimeout(() => setCentroids(next), 0);
                }
                return geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    className="fill-app-land"
                    stroke="hsl(15, 72%, 55%)"
                    strokeWidth={0.3}
                    strokeOpacity={0.3}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none" },
                      pressed: { outline: "none" },
                    }}
                  />
                ));
              }}
            </Geographies>

            {userLoc && (
              <Marker coordinates={userLoc}>
                <circle
                  r={radiusDeg}
                  fill="hsl(15, 72%, 55%)"
                  fillOpacity={0.1}
                  stroke="hsl(15, 72%, 55%)"
                  strokeOpacity={0.4}
                  strokeWidth={0.6 / zoom}
                />
                <circle r={3 / zoom} fill="hsl(15, 72%, 55%)" />
              </Marker>
            )}

            {points.map((p) => {
              const total = p.acts + p.commitments;
              const r = Math.min(10, 3 + Math.log2(total + 1)) / zoom;
              return (
                <Marker
                  key={p.country}
                  coordinates={p.coordinates}
                  onClick={() => setActive(p)}
                  style={{ default: { cursor: "pointer" } }}
                >
                  <circle r={r} fill="hsl(15, 72%, 55%)" fillOpacity={0.8} />
                  <circle r={r} fill="none" stroke="hsl(15, 72%, 55%)" strokeWidth={0.6 / zoom}>
                    <animate attributeName="r" from={r} to={r * 3} dur="2.4s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" from="0.5" to="0" dur="2.4s" repeatCount="indefinite" />
                  </circle>
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        <div className="absolute end-3 top-3 flex flex-col gap-2">
          <button
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.6))}
            aria-label="Zoom in"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-app-surface text-foreground shadow-sm"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.6))}
            aria-label="Zoom out"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-app-surface text-foreground shadow-sm"
          >
            <Minus size={16} />
          </button>
        </div>

        {active && (
          <div className="absolute bottom-3 start-3 rounded-xl bg-app-surface px-4 py-2 shadow-md">
            <p className="text-sm font-semibold text-foreground">{active.country}</p>
            <p className="text-xs text-muted-foreground">
              {nf.format(active.acts)} acts · {nf.format(active.commitments)} commitments
            </p>
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 size={20} className="animate-spin text-app-coral" />
          </div>
        )}
      </div>

      <section className="relative mt-3 flex-1 rounded-t-3xl bg-app-surface px-5 pb-6 pt-3">
        <div className="mx-auto h-1 w-10 rounded-full bg-border" />
        <h2 className="mt-4 font-sans text-base font-bold text-foreground">Latest kindness</h2>
        {acts.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No acts published yet — be the first.</p>
        ) : (
          <ul className="mt-3 space-y-1">
            {acts.map((act) => (
              <li key={act.id} className="flex items-center gap-3 py-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-app-coral-tint text-lg">
                  ✨
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{act.description}</p>
                  <p className="truncate text-xs text-muted-foreground">{act.name}</p>
                </div>
                <span className="shrink-0 text-xs font-bold text-app-teal">{timeAgo(act.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
