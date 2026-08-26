import { useEffect, useMemo, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { geoCentroid } from "d3-geo";
import { Loader2, LocateFixed, Minus, Plus, Search } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import ScrollToTop from "@/components/ScrollToTop";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const RADIUS_MILES = 100;
const MIN_ZOOM = 1;
const MAX_ZOOM = 40;
const LOCAL_ZOOM = 26;

type CountRow = { country: string; acts: number; commitments: number };
type Point = { country: string; coordinates: [number, number]; acts: number; commitments: number };

const NAME_ALIASES: Record<string, string> = {
  "united states of america": "united states",
  "usa": "united states",
  "russian federation": "russia",
  "republic of korea": "south korea",
  "korea, republic of": "south korea",
  "dem. rep. korea": "north korea",
  "united kingdom of great britain and northern ireland": "united kingdom",
  "czech republic": "czechia",
  "dominican rep.": "dominican republic",
  "bosnia and herz.": "bosnia and herzegovina",
  "central african rep.": "central african republic",
  "dem. rep. congo": "democratic republic of the congo",
  "eq. guinea": "equatorial guinea",
  "s. sudan": "south sudan",
  "solomon is.": "solomon islands",
  "côte d'ivoire": "côte d'ivoire",
  "cote d'ivoire": "côte d'ivoire",
  "ivory coast": "côte d'ivoire",
  "swaziland": "eswatini",
  "cape verde": "cabo verde",
  "burma": "myanmar",
};

const normalize = (name: string) => {
  const key = name.trim().toLowerCase();
  return NAME_ALIASES[key] ?? key;
};

// Approximate degrees for a 100-mile radius (latitude degrees are ~69 miles).
const milesToLatDeg = (miles: number) => miles / 69;

const MapPage = () => {
  const { t } = useLanguage();
  const [rows, setRows] = useState<CountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [centroids, setCentroids] = useState<Record<string, [number, number]>>({});
  const [center, setCenter] = useState<[number, number]>([0, 20]);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [userLoc, setUserLoc] = useState<[number, number] | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Point | null>(null);
  const requestedLocation = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc("kindness_map_counts");
      if (!cancelled) {
        setRows(((data as CountRow[]) ?? []).filter((r) => r.country));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locate = () => {
    if (!("geolocation" in navigator)) {
      setLocError(t.mapPage.locationUnavailable);
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
        setLocError(t.mapPage.locationDenied);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  };

  useEffect(() => {
    if (requestedLocation.current) return;
    requestedLocation.current = true;
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const points = useMemo<Point[]>(() => {
    return rows
      .map((r) => {
        const coords = centroids[normalize(r.country)];
        if (!coords) return null;
        return { country: r.country, coordinates: coords, acts: Number(r.acts), commitments: Number(r.commitments) };
      })
      .filter(Boolean) as Point[];
  }, [rows, centroids]);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return points.filter((p) => p.country.toLowerCase().includes(q)).slice(0, 6);
  }, [query, points]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({ acts: acc.acts + Number(r.acts), commitments: acc.commitments + Number(r.commitments) }),
        { acts: 0, commitments: 0 },
      ),
    [rows],
  );

  const goToCountry = (p: Point) => {
    setCenter(p.coordinates);
    setZoom(6);
    setActive(p);
    setQuery("");
  };

  const radiusDeg = milesToLatDeg(RADIUS_MILES);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${t.mapPage.title} — Pásalo Pa'lante`}
        description={t.mapPage.description}
        path="/map"
      />
      <Navbar />

      <main className="pt-28 pb-20 section-padding">
        <div className="max-w-6xl mx-auto">
          <p className="eyebrow mb-3">{t.mapPage.eyebrow}</p>
          <h1 className="headline-lg text-foreground mb-4">{t.mapPage.title}</h1>
          <p className="body-lg text-muted-foreground max-w-2xl mb-8">{t.mapPage.description}</p>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.mapPage.searchPlaceholder}
                aria-label={t.mapPage.searchPlaceholder}
                className="w-full rounded-full border border-border bg-card ps-9 pe-4 py-3 text-sm text-foreground outline-none focus:border-primary"
              />
              {suggestions.length > 0 && (
                <ul className="absolute z-20 mt-2 w-full rounded-2xl border border-border bg-card shadow-lg overflow-hidden">
                  {suggestions.map((s) => (
                    <li key={s.country}>
                      <button
                        onClick={() => goToCountry(s)}
                        className="w-full text-left px-4 py-3 text-sm text-foreground hover:bg-muted transition-colors"
                      >
                        {s.country}
                        <span className="text-muted-foreground"> · {s.acts + s.commitments}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button onClick={locate} className="btn-secondary !py-3 !px-5 !text-sm inline-flex items-center gap-2">
              {locating ? <Loader2 size={16} className="animate-spin" /> : <LocateFixed size={16} />}
              {t.mapPage.useMyLocation}
            </button>
          </div>

          {locError && <p className="text-sm text-muted-foreground mb-4">{locError}</p>}

          <div
            className="relative rounded-2xl overflow-hidden border border-border"
            style={{ background: "hsl(var(--warm-sand) / 0.3)" }}
          >
            <ComposableMap projection="geoMercator" projectionConfig={{ scale: 130 }} style={{ width: "100%", height: "auto" }}>
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
                        fill="hsl(15, 72%, 55%)"
                        fillOpacity={0.12}
                        stroke="hsl(15, 72%, 55%)"
                        strokeWidth={0.4}
                        strokeOpacity={0.35}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none", fillOpacity: 0.2 },
                          pressed: { outline: "none" },
                        }}
                      />
                    ));
                  }}
                </Geographies>

                {userLoc && (
                  <>
                    <Marker coordinates={userLoc}>
                      <circle r={3 / zoom} fill="hsl(var(--primary))" />
                    </Marker>
                    <Marker coordinates={userLoc}>
                      <ellipse
                        rx={radiusDeg * 2.2}
                        ry={radiusDeg * 2.2}
                        fill="hsl(var(--primary))"
                        fillOpacity={0.08}
                        stroke="hsl(var(--primary))"
                        strokeOpacity={0.4}
                        strokeWidth={0.6 / zoom}
                      />
                    </Marker>
                  </>
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
                      <circle r={r} fill="hsl(15, 72%, 55%)" fillOpacity={0.75} />
                      <circle r={r} fill="none" stroke="hsl(15, 72%, 55%)" strokeWidth={0.6 / zoom}>
                        <animate attributeName="r" from={r} to={r * 3} dur="2.4s" repeatCount="indefinite" />
                        <animate attributeName="stroke-opacity" from="0.5" to="0" dur="2.4s" repeatCount="indefinite" />
                      </circle>
                    </Marker>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>

            <div className="absolute top-4 end-4 flex flex-col gap-2">
              <button
                onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.6))}
                aria-label={t.mapPage.zoomIn}
                className="w-10 h-10 rounded-full bg-card border border-border text-foreground flex items-center justify-center shadow-sm hover:bg-muted"
              >
                <Plus size={18} />
              </button>
              <button
                onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.6))}
                aria-label={t.mapPage.zoomOut}
                className="w-10 h-10 rounded-full bg-card border border-border text-foreground flex items-center justify-center shadow-sm hover:bg-muted"
              >
                <Minus size={18} />
              </button>
            </div>

            {active && (
              <div className="absolute bottom-4 start-4 rounded-2xl bg-card border border-border shadow-lg px-5 py-4">
                <p className="font-semibold text-foreground">{active.country}</p>
                <p className="text-sm text-muted-foreground">
                  {active.acts} {t.mapPage.acts} · {active.commitments} {t.mapPage.commitments}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
            <span>
              {loading ? "…" : totals.acts} {t.mapPage.acts}
            </span>
            <span>
              {loading ? "…" : totals.commitments} {t.mapPage.commitments}
            </span>
            <span>{t.mapPage.radiusNote}</span>
          </div>
        </div>
      </main>

      <Footer />
      <ScrollToTop />
    </div>
  );
};

export default MapPage;
