import { useEffect, useState } from "react";
import {
  collection, query, orderBy, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Responder } from "@/types";

export function useResponders() {
  const [responders, setResponders] = useState<Responder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "responders"), orderBy("name"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setResponders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Responder, "id">) })));
        setLoading(false);
      },
      (err) => {
        console.error("Responders error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  return { responders, loading };
}

export async function saveResponder(data: Omit<Responder, "id">, existingId?: string) {
  if (existingId) {
    await updateDoc(doc(db, "responders", existingId), { ...data });
  } else {
    await addDoc(collection(db, "responders"), { ...data, verified: false });
  }
}

export async function deleteResponder(id: string) {
  await deleteDoc(doc(db, "responders", id));
}

