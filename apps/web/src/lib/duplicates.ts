import type { Report } from "@/types";
import { isOpenReport } from "@/lib/utils";

// Duplicate-report linking (P3, PDRRMO §8). Suggests reports that are probably
// about the same incident so an admin can link them; nothing is merged or
// closed automatically. "Likely duplicate" = same municipality and category,
// filed within WINDOW_H hours of each other, and either in the same barangay
// or, when both have GPS, within RADIUS_M metres.

export const WINDOW_H = 48;
export const RADIUS_M = 500;

function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371e3, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function likelyDuplicates(report: Report, all: Report[]): Report[] {
  const t = report.reportedAt.getTime();
  const gps = (r: Report) =>
    typeof r.latitude === "number" && typeof r.longitude === "number" ? { lat: r.latitude, lng: r.longitude } : null;
  const here = gps(report);
  return all
    .filter((r) => r.id !== report.id && isOpenReport(r))
    .filter((r) => r.municipality === report.municipality && r.category === report.category)
    .filter((r) => Math.abs(r.reportedAt.getTime() - t) <= WINDOW_H * 3600e3)
    .filter((r) => {
      const there = gps(r);
      if (here && there) return metresBetween(here, there) <= RADIUS_M;
      return !!report.barangay && r.barangay === report.barangay;
    })
    .sort((a, b) => a.reportedAt.getTime() - b.reportedAt.getTime());
}

/** Reports already closed as duplicates of this one. */
export function linkedDuplicates(report: Report, all: Report[]): Report[] {
  return all.filter((r) => r.duplicateOf === report.id);
}
