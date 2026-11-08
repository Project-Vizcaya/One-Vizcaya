import { MUNICIPALITIES } from "@/data/municipalities";

// Simple SVG of Nueva Vizcaya drawn from the real municipal boundaries in
// src/data/municipalities.ts (equirectangular, scaled by cos(latitude)).
const W = 400;
const rings = MUNICIPALITIES.flatMap((m) => m.coordinates.map((ring) => ({ name: m.name, ring })));
const all = rings.flatMap((r) => r.ring);
const minLng = Math.min(...all.map((p) => p[0]));
const maxLng = Math.max(...all.map((p) => p[0]));
const minLat = Math.min(...all.map((p) => p[1]));
const maxLat = Math.max(...all.map((p) => p[1]));
const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
const scale = W / ((maxLng - minLng) * k);
const H = Math.round((maxLat - minLat) * scale);

const PATHS = MUNICIPALITIES.map((m) => ({
  name: m.name,
  d: m.coordinates
    .map(
      (ring) =>
        "M" +
        ring
          .map(([lng, lat]) => `${(((lng - minLng) * k) * scale).toFixed(1)},${((maxLat - lat) * scale).toFixed(1)}`)
          .join("L") +
        "Z",
    )
    .join(""),
}));

export function MunicipalityMap({
  className = "",
  highlight = [],
  titled = false,
}: {
  className?: string;
  highlight?: string[];
  titled?: boolean;
}) {
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} aria-hidden={!titled} role={titled ? "img" : undefined}>
      {titled && <title>Map of the 15 municipalities of Nueva Vizcaya</title>}
      {PATHS.map((p) => (
        <path
          key={p.name}
          d={p.d}
          className={highlight.includes(p.name) ? "fill-[#166534]" : "fill-[#bbf7d0]"}
          stroke="#ffffff"
          strokeWidth={1.5}
          strokeLinejoin="round"
        >
          {titled && <title>{p.name}</title>}
        </path>
      ))}
    </svg>
  );
}
