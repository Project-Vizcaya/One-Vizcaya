import { useEffect, useState } from "react";
import {
  collectionGroup,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  doc,
  updateDoc,
  Timestamp,
  arrayUnion,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Report, ReportNote, ReportStatus } from "@/types";

function toReport(docSnap: { id: string; data: () => Record<string, unknown>; ref: { parent: { parent: { id: string } | null } | null } }): Report {
  const d = docSnap.data();
  return {
    id: docSnap.id,
    userId: docSnap.ref?.parent?.parent?.id ?? (d.userId as string) ?? "",
    category: (d.category as string) ?? "Other",
    priority: (d.priority as Report["priority"]) ?? "low",
    status: (d.status as Report["status"]) ?? "reported",
    municipality: (d.municipality as string) ?? "",
    barangay: d.barangay as string | undefined,
    location: (d.location as string) ?? "",
    description: (d.description as string) ?? "",
    isAnonymous: (d.isAnonymous as boolean) ?? false,
    reportedAt: d.reportedAt instanceof Timestamp ? d.reportedAt.toDate() : new Date(),
    resolvedAt: d.resolvedAt instanceof Timestamp ? d.resolvedAt.toDate() : undefined,
    notes: ((d.notes as ReportNote[]) ?? []).map((n) => ({
      ...n,
      timestamp: n.timestamp instanceof Timestamp ? (n.timestamp as unknown as Timestamp).toDate() : new Date(n.timestamp),
    })),
    assignedResponder: d.assignedResponder as string | undefined,
    satisfactionRating: d.satisfactionRating as number | undefined,
    imageUrl: d.imageUrl as string | undefined,
    lastModified: d.lastModified instanceof Timestamp ? d.lastModified.toDate() : new Date(),
  };
}

export function useReports(municipality: string | null) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const baseQuery = collectionGroup(db, "reports");
    const q = municipality
      ? query(baseQuery, where("municipality", "==", municipality), orderBy("reportedAt", "desc"), limit(256))
      : query(baseQuery, orderBy("reportedAt", "desc"), limit(256));

    const unsub = onSnapshot(
      q,
      (snap) => {
        setReports(snap.docs.map(toReport));
        setLoading(false);
      },
      (err) => {
        console.error("Reports listener error:", err);
        setLoading(false);
      }
    );

    return unsub;
  }, [municipality]);

  return { reports, loading };
}

export async function updateReportStatus(
  userId: string,
  reportId: string,
  status: ReportStatus
) {
  const ref = doc(db, "users", userId, "reports", reportId);
  await updateDoc(ref, { status, lastModified: Timestamp.now() });
}

export async function addReportNote(
  userId: string,
  reportId: string,
  note: Omit<ReportNote, "timestamp"> & { timestamp: Date }
) {
  const ref = doc(db, "users", userId, "reports", reportId);
  await updateDoc(ref, {
    notes: arrayUnion({ ...note, timestamp: Timestamp.fromDate(note.timestamp) }),
    lastModified: Timestamp.now(),
  });
}

export async function deleteReport(userId: string, reportId: string) {
  await deleteDoc(doc(db, "users", userId, "reports", reportId));
}
