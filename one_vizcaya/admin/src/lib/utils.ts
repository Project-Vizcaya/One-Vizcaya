import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

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
