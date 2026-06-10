import { useEffect, useState } from "react";
import {
  collectionGroup, query, orderBy, limit, where,
  onSnapshot, doc, updateDoc, Timestamp, arrayUnion, deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Report, ReportNote, ReportStatus } from "@/types";

function toDate(val: unknown): Date {
  if (val instanceof Timestamp) return val.toDate();
  if (typeof val === "number") return new Date(val);
  if (typeof val === "string") return new Date(val);
  if (val instanceof Date) return val;
  return new Date();
}

function toReport(d: {
  id: string;
  data: () => Record<string, unknown>;
  ref: { parent: { parent: { id: string } | null } | null };
}): Report {
  const data = d.data();
  return {
    id: d.id,
    userId: d.ref?.parent?.parent?.id ?? (data.userId as string) ?? "",
    category:         (data.category as string)   ?? "Other",
    priority:         (data.priority as Report["priority"]) ?? "low",
    status:           (data.status   as Report["status"])   ?? "reported",
    municipality:     (data.municipality as string) ?? "",
    barangay:          data.barangay as string | undefined,
    location:         (data.location as string) ?? "",
    latitude:         typeof data.latitude  === "number" ? data.latitude  : undefined,
    longitude:        typeof data.longitude === "number" ? data.longitude : undefined,
    description:      (data.description as string) ?? "",
    isAnonymous:      (data.isAnonymous as boolean) ?? false,
    reportedAt:        toDate(data.reportedAt),
    resolvedAt:        data.resolvedAt ? toDate(data.resolvedAt) : undefined,
    notes: ((data.notes as ReportNote[]) ?? []).map((n) => ({
      ...n,
      timestamp: toDate(n.timestamp),
    })),
    assignedResponder: data.assignedResponder as string | undefined,
    satisfactionRating:data.satisfactionRating as number | undefined,
    imageUrl:          data.imageUrl as string | undefined,
    lastModified:      toDate(data.lastModified),
  };
}

export function useReports(municipality: string | null) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = collectionGroup(db, "reports");
    // Approval chain (full "both"): the province-wide view only shows reports a
    // Municipal admin has approved for escalation (escalatedToProvince == true).
    // A specific-municipality view still shows all of that town's reports so the
    // Municipal admin can triage and approve them.
    const q = municipality
      ? query(base, where("municipality", "==", municipality), orderBy("reportedAt", "desc"), limit(256))
      : query(base, where("escalatedToProvince", "==", true), orderBy("reportedAt", "desc"), limit(256));

    const unsub = onSnapshot(
      q,
      (snap) => { setReports(snap.docs.map(toReport)); setLoading(false); },
      (err)  => { console.error("Reports listener:", err); setLoading(false); }
    );

    return unsub;
  }, [municipality]);

  return { reports, loading };
}

export async function updateReportStatus(userId: string, reportId: string, status: ReportStatus) {
  await updateDoc(doc(db, "users", userId, "reports", reportId), {
    status,
    lastModified: Timestamp.now(),
  });
}

export async function addReportNote(
  userId: string,
  reportId: string,
  note: Omit<ReportNote, "timestamp"> & { timestamp: Date }
) {
  await updateDoc(doc(db, "users", userId, "reports", reportId), {
    notes: arrayUnion({ ...note, timestamp: Timestamp.fromDate(note.timestamp) }),
    lastModified: Timestamp.now(),
  });
}

export async function deleteReport(userId: string, reportId: string) {
  await deleteDoc(doc(db, "users", userId, "reports", reportId));
}
