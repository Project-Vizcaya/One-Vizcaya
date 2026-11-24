"use client";
import dynamic from "next/dynamic";

// Leaflet needs the browser; never render it on the server.
export const MapClient = dynamic(() => import("./HubMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full grid place-items-center text-sm text-muted-foreground">Loading map…</div>,
});
