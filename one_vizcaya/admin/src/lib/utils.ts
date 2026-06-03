import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";
import { MUNICIPALITIES } from "@/data/municipalities";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function timeAgo(date: Date | null | undefined): string {
  if (!date) return "Unknown";
  try {
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function formatDate(date: Date | null | undefined): string {
  if (!date) return "—";
  try {
    return format(date, "MMM d, yyyy h:mm a");
  } catch {
    return "—";
  }
}

export function formatShortDate(date: Date | null | undefined): string {
  if (!date) return "—";
  try {
    return format(date, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function escHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function authorColor(name: string): string {
  const colors = [
    "bg-blue-100 text-blue-800",
    "bg-purple-100 text-purple-800",
    "bg-green-100 text-green-800",
    "bg-orange-100 text-orange-800",
    "bg-pink-100 text-pink-800",
    "bg-teal-100 text-teal-800",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function getMuniSealUrl(muniName: string): string {
  const slug = muniName.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return `/img/seals/${slug}.png`;
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function isOverdue(reportedAt: Date, status: string, slaHours: number): boolean {
  if (status === "solved") return false;
  const now = new Date();
  const diffHours = (now.getTime() - reportedAt.getTime()) / (1000 * 60 * 60);
  return diffHours > slaHours;
}

function hexToHslValues(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, Math.round(l * 100)];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

export function getMunicipalityColor(name: string | null): string | null {
  if (!name) return null;
  return MUNICIPALITIES.find((m) => m.name === name)?.color ?? null;
}

// Returns CSS custom property overrides for the municipality theme.
// Apply these to document.documentElement.style so portaled components inherit them.
export function getMunicipalityVars(name: string | null): Record<string, string> {
  if (!name) return {};
  const hex = getMunicipalityColor(name);
  if (!hex?.startsWith("#")) return {};
  const [h, s] = hexToHslValues(hex);
  const sat = Math.max(s, 40); // ensure enough saturation for dark shades to read well
  return {
    "--gov-green-900": `${h} ${sat}% 10%`,
    "--gov-green-800": `${h} ${sat}% 17%`,
    "--gov-green-700": `${h} ${sat}% 23%`,
    "--gov-green-50":  `${h} ${Math.max(s - 20, 15)}% 96%`,
    "--primary":           `${h} ${sat}% 17%`,
    "--primary-foreground": "0 0% 98%",
    "--ring":              `${h} ${sat}% 20%`,
    "--accent":            `${h} ${Math.max(s - 30, 20)}% 93%`,
    "--accent-foreground": `${h} ${sat}% 17%`,
  };
}
