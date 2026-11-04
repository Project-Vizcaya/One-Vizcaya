import { useEffect, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Announcement, Broadcast } from "@/types";
import { toDelivery } from "@/lib/delivery";

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setAnnouncements(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title ?? "",
            body: data.body ?? "",
            urgent: data.urgent ?? false,
            postedBy: data.postedBy ?? "",
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate() : new Date(),
            municipality: data.municipality ?? "all",
            scheduledFor: data.scheduledFor instanceof Timestamp ? data.scheduledFor.toDate() : undefined,
            delivery: toDelivery(data.delivery),
          } as Announcement;
        })
      );
      setLoading(false);
    });
    return unsub;
  }, []);

  return { announcements, loading };
}

export async function postAnnouncement(
  data: Omit<Announcement, "id" | "timestamp"> & {
    // Optional extras: mobile reads `isUrgent` (mirror of `urgent`) and shows
    // the source link / image when present (e.g. imported from a FB post).
    isUrgent?: boolean;
    sourceUrl?: string;
    sourceLabel?: string;
    imageUrl?: string;
  }
) {
  await addDoc(collection(db, "announcements"), {
    ...data,
    // Keep both keys in sync so the mobile app (which reads `isUrgent`)
    // recognises urgency posted from the web (which used `urgent`).
    isUrgent: data.isUrgent ?? data.urgent,
    timestamp: Timestamp.now(),
  });
}

export async function deleteAnnouncement(id: string) {
  await deleteDoc(doc(db, "announcements", id));
}

export async function updateAnnouncement(id: string, data: Partial<Omit<Announcement, "id">>) {
  await updateDoc(doc(db, "announcements", id), data as Record<string, unknown>);
}

export async function sendBroadcast(data: Omit<Broadcast, "id" | "timestamp">) {
  await addDoc(collection(db, "broadcasts"), {
    ...data,
    timestamp: Timestamp.now(),
  });
}
