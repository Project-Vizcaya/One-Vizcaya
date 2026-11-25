import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { Loader2, Sparkles } from "lucide-react";
import { functions } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/useToast";

// Optional AI helper (docs/4-app-and-website/post-maker.md). Hidden unless the server says it is
// set up. The draft replaces the headline and caption in the editor; the admin
// checks and edits it before anything is posted.

interface Draft { headline: string; caption: string; remainingToday: number }

const status = httpsCallable<void, { available: boolean }>(functions, "postAssistStatus");
const draftFn = httpsCallable<Record<string, string>, Draft>(functions, "draftPostText");

export function PostAssistButton({ input, onDraft }: {
  input: { template: string; issuer: string; headline: string; body: string; lang: string };
  onDraft: (d: Draft) => void;
}) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    status().then((r) => live && setAvailable(r.data.available === true)).catch(() => live && setAvailable(false));
    return () => { live = false; };
  }, []);

  if (!available) return null;

  const run = async () => {
    setBusy(true);
    try {
      const r = await draftFn(input);
      onDraft(r.data);
      toast({ title: "AI draft added: check every fact before posting",
        description: `${r.data.remainingToday} AI drafts left today.` });
    } catch (e) {
      toast({ title: "No AI draft", description: (e as { message?: string })?.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-dashed p-3 space-y-2">
      <Button variant="secondary" size="sm" className="h-9" disabled={busy || input.headline.trim().length < 3} onClick={run}>
        {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 mr-1.5 animate-spin" /> : <Sparkles aria-hidden="true" className="h-4 w-4 mr-1.5" />}
        Draft headline and caption with AI
      </Button>
      <p className="text-xs text-muted-foreground">
        Optional. The headline and details are sent to Anthropic's Claude service to draft the text; do not include personal
        information. The AI can make mistakes: check every fact before posting.
      </p>
    </div>
  );
}
