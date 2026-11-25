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
const x = (lng: number) => (lng - minLng) * k * scale;
const y = (lat: number) => (maxLat - lat) * scale;

/** The data keeps ASCII keys; people read the proper spelling. */
export const townLabel = (name: string) => (name === "Alfonso Castaneda" ? "Alfonso Castañeda" : name);

export const PATHS = MUNICIPALITIES.map((m) => ({
  name: m.name,
  center: m.center ? { x: x(m.center.lng), y: y(m.center.lat) } : null,
  d: m.coordinates
    .map((ring) => "M" + ring.map(([lng, lat]) => `${x(lng).toFixed(1)},${y(lat).toFixed(1)}`).join("L") + "Z")
    .join(""),
}));
export const MAP_VIEWBOX = `0 0 ${W} ${H}`;
const CAPITOL = PATHS.find((p) => p.name === "Bayombong")?.center ?? null;

export function MunicipalityMap({
  className = "",
  highlight = [],
  titled = false,
  labels = false,
  capitol = false,
}: {
  className?: string;
  highlight?: string[];
  titled?: boolean;
  /** Town names on the map (hidden below the sm breakpoint, where they would crowd). */
  labels?: boolean;
  /** Gold dot on Bayombong, the provincial capital. */
  capitol?: boolean;
}) {
  return (
    <svg viewBox={MAP_VIEWBOX} className={className} aria-hidden={!titled} role={titled ? "img" : undefined}>
      {titled && <title>Map of the 15 municipalities of Nueva Vizcaya</title>}
      {PATHS.map((p) => (
        <path
          key={p.name}
          d={p.d}
          fill={highlight.includes(p.name) ? "var(--site-green, #0B4B2E)" : "var(--site-green-50, #EEF6F1)"}
          stroke="rgba(11, 75, 46, 0.45)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        >
          {titled && <title>{townLabel(p.name)}</title>}
        </path>
      ))}
      {labels && (
        <g className="hidden sm:inline" aria-hidden="true">
          {PATHS.filter((p) => p.center).map((p) => (
            <text
              key={p.name}
              x={p.center!.x}
              y={p.center!.y + (p.name === "Bayombong" && capitol ? 16 : 4)}
              textAnchor="middle"
              fontSize={p.name.length > 12 ? 9.5 : 11}
              fontWeight={700}
              fill="#13202B"
              stroke="#fff"
              strokeWidth={3}
              paintOrder="stroke"
              style={{ fontFamily: "inherit" }}
            >
              {townLabel(p.name)}
            </text>
          ))}
        </g>
      )}
      {capitol && CAPITOL && (
        <circle cx={CAPITOL.x} cy={CAPITOL.y} r={5} fill="var(--site-gold, #E2A713)" stroke="var(--site-green, #0B4B2E)" strokeWidth={2} />
      )}
    </svg>
  );
}

/** The province's outline (all towns, no inner borders): the One Vizcaya mark. */
export function ProvinceMark({ className = "", dot = true }: { className?: string; dot?: boolean }) {
  return (
    <svg viewBox={MAP_VIEWBOX} className={className} aria-hidden="true">
      {PATHS.map((p) => <path key={p.name} d={p.d} fill="currentColor" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" />)}
      {dot && CAPITOL && <circle cx={CAPITOL.x} cy={CAPITOL.y} r={26} fill="var(--site-gold, #E2A713)" />}
    </svg>
  );
}
