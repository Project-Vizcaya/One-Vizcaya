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
// Nudges for labels that would collide in the small northern towns.
const LABEL_SHIFT: Record<string, [number, number]> = { Villaverde: [-14, -4], Bagabag: [14, 6], Ambaguio: [-6, 2], Solano: [4, 2] };

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
          stroke="var(--site-green-600, #15803D)"
          strokeWidth={1}
          strokeLinejoin="round"
        >
          {titled && <title>{townLabel(p.name)}</title>}
        </path>
      ))}
      {labels && (
        <g className="hidden sm:inline" aria-hidden="true">
          {PATHS.filter((p) => p.center).map((p) => {
            // Long names on two lines so every label stays at 12px or more.
            const words = townLabel(p.name).split(" ");
            const lines = words.length > 1 && p.name.length > 9 ? [words[0], words.slice(1).join(" ")] : [words.join(" ")];
            const [dx, dy] = LABEL_SHIFT[p.name] ?? [0, 0];
            const cx = p.center!.x + dx;
            const y0 = p.center!.y + dy + (p.name === "Bayombong" && capitol ? 18 : 4) - (lines.length - 1) * 6.5;
            return (
              <text key={p.name} x={cx} y={y0} textAnchor="middle" fontSize={13} fontWeight={700}
                fill="#13202B" stroke="#fff" strokeWidth={3} paintOrder="stroke" style={{ fontFamily: "inherit" }}>
                {lines.map((l, i) => <tspan key={l} x={cx} dy={i === 0 ? 0 : 13}>{l}</tspan>)}
              </text>
            );
          })}
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
