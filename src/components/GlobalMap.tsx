import { useState, useEffect, useCallback, useRef } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { motion, useInView } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const REGIONS = [
  { name: "US", weight: 25, bounds: { minLng: -125, maxLng: -70, minLat: 25, maxLat: 48 } },
  { name: "Philippines", weight: 12, bounds: { minLng: 117, maxLng: 126, minLat: 5, maxLat: 18 } },
  { name: "Mexico", weight: 10, bounds: { minLng: -115, maxLng: -88, minLat: 15, maxLat: 30 } },
  { name: "Puerto Rico", weight: 10, bounds: { minLng: -67.3, maxLng: -65.2, minLat: 17.9, maxLat: 18.5 } },
  { name: "Europe West", weight: 12, bounds: { minLng: -10, maxLng: 15, minLat: 36, maxLat: 55 } },
  { name: "Europe Central", weight: 10, bounds: { minLng: 10, maxLng: 25, minLat: 45, maxLat: 55 } },
  { name: "Europe North", weight: 6, bounds: { minLng: 5, maxLng: 30, minLat: 55, maxLat: 65 } },
  { name: "Europe South", weight: 8, bounds: { minLng: -5, maxLng: 20, minLat: 35, maxLat: 45 } },
  { name: "Europe East", weight: 5, bounds: { minLng: 20, maxLng: 40, minLat: 45, maxLat: 58 } },
  { name: "UK", weight: 5, bounds: { minLng: -6, maxLng: 2, minLat: 50, maxLat: 56 } },
  { name: "India", weight: 6, bounds: { minLng: 68, maxLng: 90, minLat: 8, maxLat: 35 } },
  { name: "China", weight: 4, bounds: { minLng: 75, maxLng: 130, minLat: 20, maxLat: 45 } },
  { name: "Brazil", weight: 8, bounds: { minLng: -73, maxLng: -35, minLat: -30, maxLat: 5 } },
  { name: "Argentina", weight: 5, bounds: { minLng: -73, maxLng: -53, minLat: -50, maxLat: -22 } },
  { name: "Colombia", weight: 5, bounds: { minLng: -79, maxLng: -67, minLat: -4, maxLat: 12 } },
  { name: "Chile", weight: 3, bounds: { minLng: -75, maxLng: -67, minLat: -50, maxLat: -18 } },
  { name: "Peru", weight: 3, bounds: { minLng: -81, maxLng: -69, minLat: -18, maxLat: 0 } },
  { name: "Venezuela", weight: 3, bounds: { minLng: -73, maxLng: -60, minLat: 2, maxLat: 12 } },
  { name: "Nigeria", weight: 3, bounds: { minLng: 3, maxLng: 14, minLat: 4, maxLat: 14 } },
  { name: "Japan", weight: 3, bounds: { minLng: 130, maxLng: 145, minLat: 31, maxLat: 45 } },
  { name: "Indonesia", weight: 3, bounds: { minLng: 95, maxLng: 141, minLat: -8, maxLat: 5 } },
  { name: "Egypt", weight: 2, bounds: { minLng: 25, maxLng: 35, minLat: 22, maxLat: 31 } },
  { name: "Australia", weight: 10, bounds: { minLng: 113, maxLng: 153, minLat: -38, maxLat: -12 } },
  { name: "Canada", weight: 10, bounds: { minLng: -130, maxLng: -60, minLat: 45, maxLat: 60 } },
  { name: "South Africa", weight: 2, bounds: { minLng: 17, maxLng: 33, minLat: -34, maxLat: -22 } },
  { name: "Kenya", weight: 2, bounds: { minLng: 34, maxLng: 42, minLat: -5, maxLat: 5 } },
  { name: "Thailand", weight: 2, bounds: { minLng: 98, maxLng: 106, minLat: 6, maxLat: 20 } },
  { name: "Saudi Arabia", weight: 4, bounds: { minLng: 35, maxLng: 55, minLat: 16, maxLat: 32 } },
  { name: "UAE", weight: 3, bounds: { minLng: 51, maxLng: 56, minLat: 22, maxLat: 26 } },
  { name: "Israel", weight: 2, bounds: { minLng: 34, maxLng: 36, minLat: 29, maxLat: 33 } },
  { name: "Turkey", weight: 3, bounds: { minLng: 26, maxLng: 44, minLat: 36, maxLat: 42 } },
];

interface MapPoint {
  id: string;
  coordinates: [number, number];
  timestamp: number;
}

const GlobalMap = () => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const [points, setPoints] = useState<MapPoint[]>([]);
  const { t } = useLanguage();

  const generateRandomPoint = useCallback((): MapPoint => {
    const totalWeight = REGIONS.reduce((sum, r) => sum + r.weight, 0);
    let randomNum = Math.random() * totalWeight;
    let selectedRegion = REGIONS[0];

    for (const region of REGIONS) {
      if (randomNum < region.weight) {
        selectedRegion = region;
        break;
      }
      randomNum -= region.weight;
    }

    const lng = Math.random() * (selectedRegion.bounds.maxLng - selectedRegion.bounds.minLng) + selectedRegion.bounds.minLng;
    const lat = Math.random() * (selectedRegion.bounds.maxLat - selectedRegion.bounds.minLat) + selectedRegion.bounds.minLat;

    return {
      id: Math.random().toString(36).substr(2, 9),
      coordinates: [lng, lat],
      timestamp: Date.now(),
    };
  }, []);

  useEffect(() => {
    if (!inView) return;

    const initial: MapPoint[] = [];
    for (let i = 0; i < 200; i++) {
      initial.push({
        ...generateRandomPoint(),
        timestamp: Date.now() - Math.random() * 4000,
      });
    }
    setPoints(initial);

    const spawnInterval = setInterval(() => {
      const newPoints: MapPoint[] = [];
      for (let i = 0; i < 8; i++) {
        newPoints.push(generateRandomPoint());
      }
      setPoints((prev) => [...prev, ...newPoints]);
    }, 200);

    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      setPoints((prev) => prev.filter((p) => now - p.timestamp < 5000));
    }, 500);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(cleanupInterval);
    };
  }, [generateRandomPoint, inView]);

  return (
    <section ref={ref} className="section-padding section-spacing">
      <div className="max-w-6xl mx-auto text-center">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          className="eyebrow mb-4"
        >
          {t.globalMap.eyebrow}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.1 }}
          className="headline-lg text-foreground mb-4 mx-auto lg:max-w-[90%]"
        >
          {t.globalMap.heading}
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ delay: 0.2 }}
          className="body-lg text-muted-foreground max-w-2xl mx-auto mb-12"
        >
          {t.globalMap.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mb-12 w-full relative rounded-2xl overflow-hidden max-h-[700px]"
          style={{ background: "hsl(var(--warm-sand) / 0.3)" }}
        >
          <ComposableMap
            projection="geoMercator"
            projectionConfig={{ scale: 130, center: [0, 30] }}
            style={{ width: "100%", height: "auto", maxHeight: "700px" }}
          >
            <Geographies geography={geoUrl}>
              {({ geographies }) =>
                geographies.map((geo) => (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill="hsl(15, 72%, 55%)"
                    fillOpacity={0.12}
                    stroke="hsl(15, 72%, 55%)"
                    strokeWidth={0.5}
                    strokeOpacity={0.3}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", fillOpacity: 0.2 },
                      pressed: { outline: "none" },
                    }}
                  />
                ))
              }
            </Geographies>

            {points.map((point) => {
              const age = Date.now() - point.timestamp;
              const lifespan = 5000;
              const fadeInDuration = 600;
              const fadeOutStart = lifespan - 1000;

              let opacity = 1;
              if (age < fadeInDuration) {
                opacity = age / fadeInDuration;
              } else if (age > fadeOutStart) {
                opacity = Math.max(0, 1 - (age - fadeOutStart) / 1000);
              }

              return (
                <Marker key={point.id} coordinates={point.coordinates}>
                  <circle r={2} fill="hsl(15, 72%, 55%)" opacity={opacity * 0.85} />
                  <circle r={2} fill="none" stroke="hsl(15, 72%, 55%)" strokeWidth={0.8} opacity={opacity * 0.35}>
                    <animate attributeName="r" from="2" to="8" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="stroke-opacity" from="0.35" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                </Marker>
              );
            })}
          </ComposableMap>
        </motion.div>

        <a href="#join" className="btn-primary">
          {t.globalMap.cta}
        </a>
      </div>
    </section>
  );
};

export default GlobalMap;
