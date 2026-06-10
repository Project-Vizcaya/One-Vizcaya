import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  doc,
  updateDoc,
  getDocs,
  Timestamp,
  addDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { AdminUser, AuditLog } from "@/types";
import type { AdminRole } from "@/lib/firebase";

export function useUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), orderBy("name"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AdminUser, "id">),
        }))
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  return { users, loading };
}

export async function saveUserRole(
  uid: string,
  role: AdminRole | "citizen",
  municipality?: string,
  barangay?: string,
) {
  const update: Record<string, unknown> = { role };
  if (municipality !== undefined) update.municipality = municipality;
  // A Barangay admin is scoped to one barangay; clear it for any other role so
  // a demoted/re-scoped account never keeps a stale barangay grant.
  update.barangay = role === "barangay_admin" ? (barangay ?? "") : null;
  await updateDoc(doc(db, "users", uid), update);
}

export function useAuditLog() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      setLogs(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            action: data.action ?? "",
            details: data.details ?? {},
            userId: data.userId ?? "",
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
            ipAddress: data.ipAddress,
          } as AuditLog;
        })
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  return { logs, loading };
}

export async function writeAuditLog(userId: string, action: string, details: Record<string, unknown>) {
  await addDoc(collection(db, "audit_logs"), {
    action,
    details,
    userId,
    timestamp: Timestamp.now(),
  });
}
