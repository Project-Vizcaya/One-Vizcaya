import { useEffect, useState } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { Loader2, Save } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import { DEFAULT_SLA_HOURS, SLA_PRIORITIES, useSla, type SlaPriority } from "@/lib/sla";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/useToast";

// SLA targets are Province policy. Provincial admins can edit them here; until
// they explicitly confirm them, every figure built on them (the Overdue count,
// overdue escalations) is labelled provisional. firestore.rules already
// restricts config writes to provincial admins.

const LABEL: Record<SlaPriority, string> = {
  critical: "Critical", high: "High", medium: "Medium", low: "Low",
};

export function SlaSettingsCard() {
  const sla = useSla();
  const role = useAuthStore((s) => s.user?.role);
  const canEdit = role === "provincial_admin" || role === "admin" || role === "super_admin";
  const [hours, setHours] = useState<Record<SlaPriority, string>>(() =>
    Object.fromEntries(SLA_PRIORITIES.map((p) => [p, String(sla.hoursByPriority[p])])) as Record<SlaPriority, string>);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setHours(Object.fromEntries(SLA_PRIORITIES.map((p) => [p, String(sla.hoursByPriority[p])])) as Record<SlaPriority, string>);
  }, [sla]);

  const parsed = SLA_PRIORITIES.map((p) => Number(hours[p]));
  const valid = parsed.every((h) => Number.isFinite(h) && h > 0);

  const save = async (confirm: boolean) => {
    if (!valid) return;
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "sla"), {
        hoursByPriority: Object.fromEntries(SLA_PRIORITIES.map((p, i) => [p, parsed[i]])),
        provisional: !confirm,
        updatedBy: auth.currentUser?.uid ?? null,
        updatedAt: serverTimestamp(),
      });
      toast({ title: confirm ? "SLA targets confirmed" : "SLA targets saved as provisional" });
    } catch (e) {
      toast({ title: "Could not save SLA targets", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2 border-b">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="h-1 w-4 rounded bg-[hsl(var(--gov-green-800))]" />
          <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">SLA targets</CardTitle>
          {sla.provisional
            ? <Badge variant="outline" className="text-xs border-amber-400 text-amber-700">Provisional — pending PDRRMO approval</Badge>
            : <Badge variant="secondary" className="text-xs">Confirmed</Badge>}
        </div>
      </CardHeader>
      <CardContent className="pt-4 space-y-3">
        <p className="text-xs text-muted-foreground">
          Hours an open report may remain unresolved, by priority, before it counts as overdue and the responsible
          admins are alerted. Defaults: {SLA_PRIORITIES.map((p) => `${LABEL[p]} ${DEFAULT_SLA_HOURS[p]} h`).join(" · ")}.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {SLA_PRIORITIES.map((p) => (
            <label key={p} className="text-xs space-y-1">
              <span className="font-semibold">{LABEL[p]}</span>
              <div className="flex items-center gap-1">
                <input
                  type="number" min={0.25} step={0.25}
                  name={`sla-${p}-hours`} inputMode="decimal" autoComplete="off"
                  aria-invalid={!(Number(hours[p]) > 0)}
                  value={hours[p]}
                  disabled={!canEdit || saving}
                  onChange={(e) => setHours((h) => ({ ...h, [p]: e.target.value }))}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-sm tabular-nums disabled:opacity-60 aria-[invalid=true]:border-destructive"
                />
                <span className="text-muted-foreground">h</span>
              </div>
            </label>
          ))}
        </div>
        {canEdit ? (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!valid || saving} onClick={() => save(false)}>
              {saving ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save aria-hidden="true" className="h-3.5 w-3.5 mr-1" />}Save as provisional
            </Button>
            <Button size="sm" className="h-7 text-xs" disabled={!valid || saving} onClick={() => save(true)}>
              {saving && <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin mr-1" />}Confirm as approved targets
            </Button>
            <span role="status" aria-live="polite" className="text-xs text-destructive">
              {!valid && "Each target must be a positive number of hours."}
            </span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Only provincial administrators can change SLA targets.</p>
        )}
      </CardContent>
    </Card>
  );
}
