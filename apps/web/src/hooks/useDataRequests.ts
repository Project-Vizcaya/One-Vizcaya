import { useEffect, useState } from "react";
import {
  collectionGroup, doc, getDoc, onSnapshot, serverTimestamp, Timestamp, updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

// Data-subject requests (RA 10173) residents file in the app under
// Settings → Location & Privacy → Data Privacy Request. Stored per user at
// users/{uid}/dataRequests/{id}; firestore.rules already lets admins read and
// update them through the collection-group match.

export type DataRequestStatus = "pending" | "in_review" | "completed" | "declined";

export interface DataRequest {
  id: string;
  path: string;
  type: string;
  typeLabel: string;
  details: string;
  status: DataRequestStatus;
  userId: string;
  userName?: string;
  userPhone?: string;
  userEmail?: string;
  requestedAt: Date | null;
  responseNote?: string;
  handledByName?: string;
  handledAt: Date | null;
}

const TYPE_LABELS: Record<string, string> = {
  reqAccess: "Access my data",
  reqCorrection: "Correct my data",
  reqErasure: "Erase / block my data",
  reqObject: "Object to processing",
  reqPortability: "Data portability",
  reqComplaint: "Complaint",
};

const toDate = (v: unknown) => (v instanceof Timestamp ? v.toDate() : null);

export function useDataRequests() {
  const [requests, setRequests] = useState<DataRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No orderBy: a collection-group query without one needs no index, and
    // requests are few. Sorted newest first below.
    let latest = 0;
    return onSnapshot(
      collectionGroup(db, "dataRequests"),
      async (snap) => {
        const mine = ++latest;
        const rows: DataRequest[] = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            path: d.ref.path,
            type: x.type ?? "",
            typeLabel: TYPE_LABELS[x.type] ?? x.typeLabel ?? x.type ?? "Request",
            details: x.details ?? "",
            status: (x.status ?? "pending") as DataRequestStatus,
            userId: x.userId ?? d.ref.parent.parent?.id ?? "",
            userPhone: x.userPhone ?? undefined,
            userEmail: x.userEmail ?? undefined,
            requestedAt: toDate(x.requestedAt),
            responseNote: x.responseNote ?? undefined,
            handledByName: x.handledByName ?? undefined,
            handledAt: toDate(x.handledAt),
          };
        });
        rows.sort((a, b) => (b.requestedAt?.getTime() ?? 0) - (a.requestedAt?.getTime() ?? 0));
        // Names come from the profile; a deleted account has none.
        const uids = [...new Set(rows.map((r) => r.userId).filter(Boolean))];
        const names = new Map<string, string>();
        await Promise.all(uids.map(async (uid) => {
          try {
            const p = await getDoc(doc(db, "users", uid));
            const n = p.data()?.name;
            if (typeof n === "string" && n.trim()) names.set(uid, n);
          } catch { /* profile unreadable or gone */ }
        }));
        if (mine !== latest) return; // a newer snapshot already arrived
        setRequests(rows.map((r) => ({ ...r, userName: names.get(r.userId) })));
        setLoading(false);
      },
      (e) => { setError(e.message); setLoading(false); },
    );
  }, []);

  return { requests, loading, error };
}

/** Records the decision on the request itself (who, when, reply). */
export async function updateDataRequest(
  path: string,
  status: DataRequestStatus,
  responseNote: string,
  by: { uid: string; name: string },
) {
  await updateDoc(doc(db, path), {
    status,
    responseNote: responseNote.trim(),
    handledBy: by.uid,
    handledByName: by.name,
    handledAt: serverTimestamp(),
  });
}
