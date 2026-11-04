import { useState } from "react";
import { format } from "date-fns";
import { Building2, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { referReport } from "@/hooks/useReports";
import { toast } from "@/hooks/useToast";
import { REFERRAL_OFFICE_TYPES, type Report, type ReferralOfficeType } from "@/types";

// Referral to a named office (P2, PDRRMO). Routing (above) picks the
// administrative TIER; this records which OFFICE the report was handed to,
// e.g. "MDRRMO Bambang" or "BFP Solano", by whom and when.

const OFFICE_LABEL: Record<ReferralOfficeType, string> = {
  MDRRMO: "MDRRMO — Municipal DRRM Office",
  BDRRMC: "BDRRMC — Barangay DRRM Committee",
  PDRRMO: "PDRRMO — Provincial DRRM Office",
  BFP: "BFP — Bureau of Fire Protection",
  PNP: "PNP — Philippine National Police",
  MHO: "MHO / RHU — Municipal Health Office",
  MSWDO: "MSWDO — Social Welfare & Development",
  MEO: "MEO — Municipal Engineering Office",
  DPWH: "DPWH — Public Works & Highways",
  Other: "Other office",
};

export function ReferralSection({ report }: { report: Report }) {
  const current = report.referral;
  const [editing, setEditing] = useState(!current);
  const [officeType, setOfficeType] = useState<ReferralOfficeType | "">(current?.officeType ?? "");
  const [officeName, setOfficeName] = useState(current?.officeName ?? "");
  const [contact, setContact] = useState(current?.contact ?? "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const nameOk = officeName.trim().length >= 2 && officeName.trim().length <= 120;
  const canSave = !!officeType && nameOk && !saving;

  const save = async () => {
    if (!canSave || !officeType) return;
    setSaving(true);
    try {
      await referReport(report.userId, report.id, { officeType, officeName, contact, note });
      toast({ title: `Referred to ${officeName.trim()}`, variant: "success" as never });
      setNote("");
      setEditing(false);
    } catch (e) {
      toast({ title: "Could not record the referral", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">Refer to Office</p>

      {current && !editing && (
        <div className="rounded-lg border p-3 space-y-1">
          <p className="text-sm font-semibold flex items-center gap-1.5">
            <Building2 aria-hidden="true" className="h-4 w-4 shrink-0" />
            <span className="break-words">{current.officeType} · {current.officeName}</span>
          </p>
          {current.contact && <p className="text-xs">Contact: {current.contact}</p>}
          {current.note && <p className="text-xs whitespace-pre-line break-words">{current.note}</p>}
          <p className="text-xs text-muted-foreground">
            {current.at ? `${format(current.at, "MMM d, yyyy h:mm a")} · ` : ""}
            by admin {current.by.slice(0, 8)} · recorded in the audit log
          </p>
          <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => setEditing(true)}>
            Refer to a different office…
          </Button>
        </div>
      )}

      {editing && (
        <div className="space-y-2">
          <Select value={officeType} onValueChange={(v) => setOfficeType(v as ReferralOfficeType)}>
            <SelectTrigger className="text-sm" aria-label="Office type">
              <SelectValue placeholder="Office type…" />
            </SelectTrigger>
            <SelectContent>
              {REFERRAL_OFFICE_TYPES.map((t) => (
                <SelectItem key={t} value={t} className="text-sm">{OFFICE_LABEL[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            aria-label="Office name" name="referral-office" autoComplete="off" maxLength={120}
            value={officeName} onChange={(e) => setOfficeName(e.target.value)}
            placeholder={`Office name, e.g. MDRRMO ${report.municipality || "Bambang"}…`}
            className="text-sm"
          />
          <Input
            aria-label="Contact person or number (optional)" name="referral-contact" autoComplete="off" maxLength={80}
            value={contact} onChange={(e) => setContact(e.target.value)}
            placeholder="Contact person or number (optional)…"
            className="text-sm"
          />
          <Textarea
            aria-label="Referral note (optional)" maxLength={500} rows={2}
            value={note} onChange={(e) => setNote(e.target.value)}
            placeholder="What was asked of them (optional)…"
            className="text-sm resize-none"
          />
          <div className="flex gap-2">
            <Button size="sm" className="h-8 text-xs" disabled={!canSave} onClick={save}>
              {saving ? <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin mr-1" /> : <Send aria-hidden="true" className="h-3.5 w-3.5 mr-1" />}
              Record referral
            </Button>
            {current && (
              <Button size="sm" variant="ghost" className="h-8 text-xs" disabled={saving} onClick={() => setEditing(false)}>Cancel</Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            This records the hand-off; it does not notify the office. Contact them through your usual channel.
          </p>
        </div>
      )}
    </div>
  );
}
