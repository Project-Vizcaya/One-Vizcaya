import { useState } from "react";
import { Radio, Loader2, AlertTriangle, Building2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { sendBroadcast } from "@/hooks/useAnnouncements";
import { useAuthStore } from "@/stores/authStore";
import { toast } from "@/hooks/useToast";
import { MUNICIPALITIES } from "@/data/municipalities";

export function BroadcastCard() {
  const { user } = useAuthStore();
  // Follow the dashboard scope: when viewing a single municipality (a municipal
  // admin always, or a provincial/super admin who switched the SCOPE to a town),
  // the broadcast is locked to THAT municipality — no redundant picker, and a
  // town admin can't target another town. Only province-wide view offers the
  // All Users / By Municipality choice.
  const viewAs = useAuthStore((s) => s.viewAs);
  const viewMunicipality = useAuthStore((s) => s.viewMunicipality);
  const scopedMunicipality = viewAs === "municipal" ? viewMunicipality : null;
  const isScoped = !!scopedMunicipality;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [scope, setScope] = useState<"all" | "municipality">("all");
  const [municipality, setMunicipality] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Effective target: forced to the scoped municipality when scoped.
  const effScope: "all" | "municipality" = isScoped ? "municipality" : scope;
  const effMunicipality = isScoped ? scopedMunicipality! : municipality;
  const targetLabel = effScope === "all" ? "all users province-wide" : `all users in ${effMunicipality}`;

  const canSend = !!title.trim() && !!body.trim() && (effScope === "all" || !!effMunicipality);

  const handleSend = async () => {
    if (!user || !canSend) return;
    setSaving(true);
    try {
      await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        urgent,
        scope: effScope,
        // Only include municipality when scoped — Firestore rejects an
        // `undefined` field, which was causing "All Users" to fail.
        ...(effScope === "municipality" ? { municipality: effMunicipality } : {}),
        sentBy: user.uid,
      });
      toast({ title: "Broadcast sent!", description: `Sent to ${effScope === "all" ? "all users" : effMunicipality}`, variant: "success" as never });
      setTitle("");
      setBody("");
      setUrgent(false);
      setScope("all");
      setMunicipality("");
      setConfirmOpen(false);
    } catch {
      toast({ title: "Failed to send broadcast", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {isScoped
          ? `Send a push notification to all app users in ${scopedMunicipality}.`
          : "Send push notifications to all app users or a specific municipality."}
      </p>

      <div className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs">Title *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alert title…" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Message *</Label>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Alert message…" className="resize-none" />
        </div>

        {isScoped ? (
          // Locked to the current municipality scope — no redundant picker.
          <div className="space-y-1">
            <Label className="text-xs">Recipients</Label>
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 font-medium">All users of {scopedMunicipality}</span>
              <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Recipients</Label>
              <Select value={scope} onValueChange={(v) => setScope(v as "all" | "municipality")}>
                <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="municipality">By Municipality</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "municipality" && (
              <div className="space-y-1">
                <Label className="text-xs">Municipality</Label>
                <Select value={municipality} onValueChange={setMunicipality}>
                  <SelectTrigger className="text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {MUNICIPALITIES.map((m) => <SelectItem key={m.name} value={m.name}>{m.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Switch checked={urgent} onCheckedChange={setUrgent} />
          <div>
            <p className="text-sm font-medium">Urgent</p>
            <p className="text-xs text-muted-foreground">Will trigger sound & high-priority notification</p>
          </div>
        </div>

        {urgent && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <p>This will interrupt users with a high-priority alert sound.</p>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!canSend || saving}
          onClick={() => setConfirmOpen(true)}
        >
          <Radio className="h-4 w-4 mr-2" />
          Send Broadcast
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Broadcast?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send "{title}" to {targetLabel}.
              {urgent && " This is marked URGENT."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSend} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
