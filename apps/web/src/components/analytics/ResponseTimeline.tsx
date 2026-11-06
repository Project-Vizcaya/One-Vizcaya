import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Report } from "@/types";

// PDRRMO §14 indicators: response, referral and resolution time, computed from
// the server-stamped acknowledgedAt / referredAt / resolvedAt. Reports from
// before these were recorded have no timestamps and are simply not counted —
// every figure states how many reports it is based on, so a small sample is
// visible rather than hidden.

function hours(a?: Date, b?: Date): number | null {
  if (!a || !b) return null;
  const h = (b.getTime() - a.getTime()) / 3600e3;
  return h >= 0 ? h : null;
}

function fmt(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} days`;
}

function stats(values: number[]) {
  if (values.length === 0) return null;
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  const median = s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return { median, mean, n: s.length };
}

export function ResponseTimeline({ reports }: { reports: Report[] }) {
  const rows = [
    { label: "Time to first response", hint: "reported → acknowledged",
      s: stats(reports.map((r) => hours(r.reportedAt, r.acknowledgedAt)).filter((x): x is number => x !== null)) },
    { label: "Time to referral", hint: "reported → routed / assigned",
      s: stats(reports.map((r) => hours(r.reportedAt, r.referredAt)).filter((x): x is number => x !== null)) },
    { label: "Time to resolution", hint: "reported → solved",
      s: stats(reports.filter((r) => r.status === "solved")
        .map((r) => hours(r.reportedAt, r.resolvedAt)).filter((x): x is number => x !== null)) },
  ];
  return (
    <Card>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center gap-2">
          <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Response timeline</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-4 grid gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border p-3">
            <p className="text-xs font-semibold">{r.label}</p>
            <p className="text-xs text-muted-foreground">{r.hint}</p>
            {r.s ? (
              <>
                <p className="text-2xl font-bold mt-1">{fmt(r.s.median)}</p>
                <p className="text-xs text-muted-foreground">median · mean {fmt(r.s.mean)} · {r.s.n} report{r.s.n === 1 ? "" : "s"}</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground mt-2">No timed reports yet. Recording started with this release; earlier reports have no timestamps.</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
