import type { AdminRole } from "@/lib/firebase";

export type ReportStatus = "reported" | "acknowledged" | "under_review" | "ongoing" | "solved";
export type ReportPriority = "critical" | "high" | "medium" | "low";
export type ResponderType = "mdrrmo" | "police" | "fire" | "hospital" | "health" | "dpwh";

export interface ReportNote {
  text: string;
  author: string;
  timestamp: Date;
  authorRole: string;
}

export interface Report {
  id: string;
  userId: string;
  category: string;
  priority: ReportPriority;
  status: ReportStatus;
  municipality: string;
  barangay?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  description: string;
  isAnonymous: boolean;
  reportedAt: Date;
  resolvedAt?: Date;
  notes: ReportNote[];
  assignedResponder?: string;
  satisfactionRating?: number;
  imageUrl?: string;
  lastModified: Date;
}

export interface Responder {
  id: string;
  name: string;
  type: ResponderType;
  municipality: string;
  phone: string;
  email?: string;
  address?: string;
  lat?: number;
  lng?: number;
  verified?: boolean;
}

export interface AdminUser {
  id: string;
  name: string;
  phoneNumber: string;
  email?: string;
  role: AdminRole | "citizen";
  municipality?: string;
  fcmToken?: string;
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  postedBy: string;
  timestamp: Date;
  municipality: string;
  scheduledFor?: Date;
}

export interface Broadcast {
  id: string;
  title: string;
  body: string;
  urgent: boolean;
  scope: "all" | "municipality";
  municipality?: string;
  sentBy: string;
  timestamp: Date;
}

export interface AuditLog {
  id: string;
  action: string;
  details: Record<string, unknown>;
  userId: string;
  timestamp: Date;
  ipAddress?: string;
}

export interface AuthUser {
  uid: string;
  phoneNumber: string | null;
  name: string;
  role: AdminRole;
  municipality?: string;
  barangay?: string;
}
