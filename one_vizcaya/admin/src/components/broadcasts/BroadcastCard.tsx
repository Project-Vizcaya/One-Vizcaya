import { useState } from "react";
import { Radio, Loader2, AlertTriangle } from "lucide-react";
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
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [scope, setScope] = useState<"all" | "municipality">("all");
  const [municipality, setMunicipality] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canSend = title.trim() && body.trim() && (scope === "all" || municipality);

  const handleSend = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        urgent,
        scope,
        municipality: scope === "municipality" ? municipality : undefined,
        sentBy: user.uid,
      });
      toast({ title: "Broadcast sent!", description: `Sent to ${scope === "all" ? "all users" : municipality}`, variant: "success" as never });
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
        Send push notifications to all app users or a specific municipality.
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
              This will send "{title}" to{" "}
              {scope === "all" ? "all users province-wide" : `users in ${municipality}`}.
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
