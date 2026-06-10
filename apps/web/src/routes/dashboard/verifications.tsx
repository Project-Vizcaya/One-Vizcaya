import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  collection, query, where, orderBy, onSnapshot, doc, updateDoc,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BadgeCheck, Check, X, MapPin } from "lucide-react";

export const Route = createFileRoute("/dashboard/verifications")({
  component: VerificationsPage,
});

interface VReq {
  id: string;
  uid: string;
  name: string;
  phoneNumber: string;
  municipality: string;
  barangay: string;
  docType: string;
  docUrl: string;
  status: string;
  createdAt?: Date;
}

function toDate(v: unknown): Date | undefined {
  if (v instanceof Timestamp) return v.toDate();
  return undefined;
}

function VerificationsPage() {
  const { user, viewAs, viewMunicipality } = useAuthStore();
  const [requests, setRequests] = useState<VReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const scoped = viewAs === "municipal" && viewMunicipality;

  useEffect(() => {
    const base = collection(db, "verificationRequests");
    const q = scoped
      ? query(base, where("status", "==", "pending"),
          where("municipality", "==", viewMunicipality),
          orderBy("createdAt", "desc"))
      : query(base, where("status", "==", "pending"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRequests(snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id, uid: x.uid ?? "", name: x.name ?? "", phoneNumber: x.phoneNumber ?? "",
            municipality: x.municipality ?? "", barangay: x.barangay ?? "",
            docType: x.docType ?? "", docUrl: x.docUrl ?? "", status: x.status ?? "pending",
            createdAt: toDate(x.createdAt),
          };
        }));
        setLoading(false);
      },
      (err) => { console.error("verifications:", err); setLoading(false); }
    );
    return unsub;
  }, [scoped, viewMunicipality]);

  async function decide(id: string, status: "approved" | "rejected") {
    setBusy(id);
    try {
      await updateDoc(doc(db, "verificationRequests", id), {
        status,
        decidedBy: user?.uid ?? null,
        decidedByName: user?.name ?? null,
        decidedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("decide:", e);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-3 sm:p-5 lg:p-6 space-y-5 max-w-[1600px] mx-auto">
      <div className="flex items-start justify-between gap-4 pb-3 border-b">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
            <h1 className="text-lg font-bold tracking-tight">Residency Verifications</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            {scoped ? `${viewMunicipality} · ` : "Province-wide · "}
            {loading ? "Loading…" : `${requests.length} pending`}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs font-semibold text-foreground">{user?.name}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : requests.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          <BadgeCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
          No pending residency requests.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{r.name || "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">{r.phoneNumber}</p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">Pending</Badge>
                </div>
                <p className="text-xs flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" /> {r.barangay}, {r.municipality}
                </p>
                <p className="text-xs"><span className="text-muted-foreground">Proof:</span> {r.docType}</p>
                <a href={r.docUrl} target="_blank" rel="noreferrer" className="block">
                  <img src={r.docUrl} alt="Residency proof"
                    className="rounded-md border w-full h-40 object-cover hover:opacity-90 transition" />
                </a>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" className="flex-1" disabled={busy === r.id}
                    onClick={() => decide(r.id, "approved")}>
                    <Check className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled={busy === r.id}
                    onClick={() => decide(r.id, "rejected")}>
                    <X className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
