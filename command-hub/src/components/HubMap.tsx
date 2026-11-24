"use client";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { Incident, Unit, UnitState } from "@/lib/types";
import { ageText, freshness } from "@/lib/geo";
import { fmtTime, INCIDENT_COLOR, STATUS_COLOR, STATUS_LABEL } from "./ui";

export const NV_CENTER: [number, number] = [16.42, 121.12];

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function unitIcon(u: Unit, st: UnitState, nowMs: number, selected: boolean) {
  const f = freshness(st.status, st.fix_time, nowMs);
  const label = f === "lost" ? `${u.call_sign} · signal lost ${fmtTime(st.fix_time)}` : u.call_sign;
  return L.divIcon({
    className: "",
    iconSize: [0, 0],
    html: `<div class="unit-marker ${f}" style="transform:translate(-50%,-9px)${selected ? ";filter:drop-shadow(0 0 4px #0ea5e9)" : ""}">
      <div class="dot" style="background:${STATUS_COLOR[st.status]}"></div><div class="tag">${esc(label)}</div></div>`,
  });
}

function incidentIcon(i: Incident, selected: boolean) {
  return L.divIcon({
    className: "",
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div class="incident-marker" style="background:${INCIDENT_COLOR[i.status] ?? "#7c3aed"}${selected ? ";outline:3px solid #0ea5e9" : ""}"></div>`,
  });
}

function Focus({ to }: { to: [number, number] | null }) {
  const map = useMap();
  useEffect(() => { if (to) map.flyTo(to, Math.max(map.getZoom(), 14), { duration: 0.6 }); }, [map, to]);
  return null;
}

function ClickCatcher({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onClick(e.latlng.lat, e.latlng.lng) });
  return null;
}

export interface HubMapProps {
  units?: Unit[];
  states?: UnitState[];
  incidents?: Incident[];
  nowMs: number;
  focus?: [number, number] | null;
  selectedUnitId?: string | null;
  selectedIncidentId?: string | null;
  onSelectUnit?: (id: string) => void;
  onSelectIncident?: (id: string) => void;
  /** Replay: the track so far and the replayed position. */
  track?: [number, number][];
  trackHead?: { lat: number; lng: number; label: string } | null;
  zoom?: number;
  center?: [number, number];
  onMapClick?: (lat: number, lng: number) => void;
  className?: string;
}

export default function HubMap(p: HubMapProps) {
  const byUnit = useMemo(() => new Map((p.states ?? []).map((s) => [s.unit_id, s])), [p.states]);
  return (
    <MapContainer center={p.center ?? NV_CENTER} zoom={p.zoom ?? 11} className={p.className ?? "h-full w-full"} scrollWheelZoom>
      <TileLayer url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' maxZoom={19} />
      <Focus to={p.focus ?? null} />
      {p.onMapClick && <ClickCatcher onClick={p.onMapClick} />}
      {(p.incidents ?? []).filter((i) => i.lat !== null && i.lng !== null).map((i) => (
        <Marker key={i.id} position={[i.lat!, i.lng!]} icon={incidentIcon(i, p.selectedIncidentId === i.id)}
          eventHandlers={{ click: () => p.onSelectIncident?.(i.id) }}>
          <Tooltip direction="top" offset={[0, -10]}>{i.code} · {i.category ?? "Incident"} · {i.status.replace("_", " ")}</Tooltip>
        </Marker>
      ))}
      {(p.units ?? []).map((u) => {
        const st = byUnit.get(u.id);
        if (!st || st.status === "off_duty" || st.lat === null || st.lng === null) return null;
        return (
          <Marker key={u.id} position={[st.lat, st.lng]} icon={unitIcon(u, st, p.nowMs, p.selectedUnitId === u.id)}
            eventHandlers={{ click: () => p.onSelectUnit?.(u.id) }} zIndexOffset={1000}>
            <Tooltip direction="top" offset={[0, -12]}>
              {u.call_sign} · {u.agency} · {STATUS_LABEL[st.status]} · {ageText(st.fix_time, p.nowMs)}
              {st.accuracy_m ? ` · ±${Math.round(st.accuracy_m)} m` : ""}
            </Tooltip>
          </Marker>
        );
      })}
      {p.track && p.track.length > 1 && <Polyline positions={p.track} pathOptions={{ color: "#0ea5e9", weight: 4 }} />}
      {p.trackHead && (
        <CircleMarker center={[p.trackHead.lat, p.trackHead.lng]} radius={9} pathOptions={{ color: "#fff", weight: 3, fillColor: "#0ea5e9", fillOpacity: 1 }}>
          <Tooltip permanent direction="top" offset={[0, -10]}>{p.trackHead.label}</Tooltip>
        </CircleMarker>
      )}
    </MapContainer>
  );
}
