import type { AdminRole } from "@/lib/firebase";

// "closed" = closed WITHOUT action, always with a ReportDisposition (§8).
// Distinct from "solved" so a false report is never counted as resolved.
// "archived": set by archiveOldReports 12 months after filing (retention);
// statusBeforeArchive keeps what it was.
export type ReportStatus = "reported" | "acknowledged" | "under_review" | "ongoing" | "solved" | "closed" | "archived";
export type ReportDisposition = "false_report" | "duplicate" | "incomplete" | "unverifiable";
export type ReportPriority = "critical" | "high" | "medium" | "low";
// Administrative tier currently handling a report. Mirrors the mobile
// HandlingLevel enum (Firestore stores these exact string keys).
export type HandlingLevel = "barangay" | "municipal" | "provincial" | "region_ii";
export type ResponderType = "mdrrmo" | "police" | "fire" | "hospital" | "health" | "dpwh";

export interface ReportNote {
  text: string;
  author: string;
  timestamp: Date;
  authorRole: string;
}

/** Office types a report can be referred to; must match firestore.rules. */
export const REFERRAL_OFFICE_TYPES = [
  "MDRRMO", "BDRRMC", "PDRRMO", "BFP", "PNP", "MHO", "MSWDO", "MEO", "DPWH", "Other",
] as const;
export type ReferralOfficeType = (typeof REFERRAL_OFFICE_TYPES)[number];

/** The office a report was handed to (P2). Replaced on re-referral; the audit
 *  log keeps the history. */
export interface Referral {
  officeType: ReferralOfficeType;
  officeName: string;
  contact?: string;
  note?: string;
  by: string;
  at?: Date;
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
  // Response timeline, stamped server-side (stampReportMilestones). Absent on
  // reports that predate it — those are not back-filled.
  acknowledgedAt?: Date;
  referredAt?: Date;
  resolvedAt?: Date;
  notes: ReportNote[];
  assignedResponder?: string;
  satisfactionRating?: number;
  imageUrl?: string;
  photoSource?: "camera" | "gallery";
  photoLatitude?: number;
  photoLongitude?: number;
  photoTimestamp?: Date;
  lastModified: Date;
  handlingLevel: HandlingLevel;
  escalatedToProvince?: boolean;
  // Set together, only by an in-scope admin (enforced in firestore.rules).
  disposition?: ReportDisposition;
  dispositionReason?: string;
  dispositionBy?: string;
  dispositionAt?: Date;
  duplicateOf?: string;
  referral?: Referral;
  statusBeforeArchive?: string;
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
  barangay?: string;
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
  delivery?: Delivery;
}

/** Push counts written by the server after an alert is sent (P2). */
export interface Delivery {
  attempted: number;
  delivered: number;
  failed: number;
  invalidTokensRemoved: number;
  completedAt?: Date;
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

export type SosStatus = "active" | "dispatched" | "resolved" | "cancelled";

// A live emergency beacon — a citizen's SOS with continuously-updated location.
export interface SosAlert {
  id: string;
  uid: string;
  name: string;
  phone: string;
  municipality: string;
  barangay?: string;
  lat?: number;
  lng?: number;
  accuracy?: number;
  status: SosStatus;
  note?: string;
  tracking: boolean;
  verified: boolean;
  flagged: boolean;
  flagReason?: string;
  disposition?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// A nomination in the #8 workflow: an admin proposes a role for a user; a
// super_admin approves/rejects. The role write happens server-side on approval.
export interface RoleRequest {
  id: string;
  targetUid: string;
  targetName: string;
  targetPhone?: string;
  requestedRole: AdminRole | "citizen";
  municipality?: string;
  barangay?: string;
  nominatedBy: string;
  nominatedByName: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
  decidedBy?: string;
  decidedAt?: Date;
}
