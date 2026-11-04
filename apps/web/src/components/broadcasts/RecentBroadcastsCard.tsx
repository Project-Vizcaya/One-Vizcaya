import { useEffect, useState } from "react";
import { collection, limit, onSnapshot, orderBy, query, Timestamp } from "firebase/firestore";
import { Send } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { deliveryLabel, toDelivery } from "@/lib/delivery";
import type { Delivery } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// Recently sent broadcasts with their push delivery counts (P2). Counts are
// written by onNewBroadcast once FCM has answered; see lib/delivery.ts for
// what "accepted" does and does not mean.

interface Row {
  id: string;
  title: string;
  urgent: boolean;
  town: string | null; // null = province-wide
  sentAt: Date;
  delivery?: Delivery;
}

export function RecentBroadcastsCard() {
  const viewAs = useAuthStore((s) => s.viewAs);
  const viewMunicipality = useAuthStore((s) => s.viewMunicipality);
  const town = viewAs === "municipal" ? viewMunicipality : null;
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    // Filtered in code: a town filter plus this ordering would need a new index.
    const q = query(collection(db, "broadcasts"), orderBy("timestamp", "desc"), limit(30));
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => {
        const x = d.data();
        const named = typeof x.municipality === "string" && x.municipality
          ? x.municipality
          : typeof x.scope === "string" && !["all", "All Province", "municipality"].includes(x.scope) ? x.scope : null;
        return {
          id: d.id,
          title: String(x.title ?? ""),
          urgent: x.urgent === true,
          town: named,
          sentAt: x.timestamp instanceof Timestamp ? x.timestamp.toDate() : new Date(0),
          delivery: toDelivery(x.delivery),
        };
      }));
    }, () => setRows([]));
  }, []);

  const shown = (town ? rows.filter((r) => r.town === town || r.town === null) : rows).slice(0, 10);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Send aria-hidden="true" className="h-4 w-4" /> Recently sent
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          “Accepted” means Firebase took the alert for that phone. A phone that is off receives it when it reconnects, if it does so soon enough.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {shown.length === 0 && <p className="text-xs text-muted-foreground">No broadcasts sent yet.</p>}
        {shown.map((r) => (
          <div key={r.id} className="rounded-md border p-2.5 space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {r.urgent && <Badge variant="destructive" className="text-xs">URGENT</Badge>}
              <Badge variant="outline" className="text-xs">{r.town ?? "Province-wide"}</Badge>
              <span className="text-xs text-muted-foreground">
                {r.sentAt.toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}
              </span>
            </div>
            <p className="text-sm font-medium break-words">{r.title}</p>
            <p className={`text-xs tabular-nums ${r.delivery && r.delivery.failed > 0 ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground"}`}>
              {deliveryLabel(r.delivery, r.sentAt)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
