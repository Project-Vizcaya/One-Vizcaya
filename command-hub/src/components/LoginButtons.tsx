"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2 } from "lucide-react";

export function LoginButtons({ accounts, mono = false }: { accounts: { userId: string; name: string; detail?: string }[]; mono?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const go = async (userId: string) => {
    setBusy(userId); setError(null);
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { setError(j.error ?? "Sign-in failed."); setBusy(null); return; }
    router.push(j.home);
    router.refresh();
  };
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {accounts.map((a) => (
        <button key={a.userId} disabled={busy !== null} onClick={() => go(a.userId)}
          className="group card flex items-center gap-3 px-3 py-2.5 text-left min-h-[56px] transition-colors duration-150 hover:border-primary hover:bg-accent disabled:opacity-60 cursor-pointer">
          <span className="min-w-0 flex-1">
            <span className={`block font-bold text-sm truncate ${mono ? "font-code" : ""}`}>{a.name}</span>
            {a.detail && <span className="block text-[13px] text-muted-foreground truncate">{a.detail}</span>}
          </span>
          {busy === a.userId
            ? <Loader2 aria-label="Signing in" className="h-4 w-4 animate-spin text-primary" />
            : <ChevronRight aria-hidden className="h-4 w-4 text-muted-foreground group-hover:text-primary" />}
        </button>
      ))}
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
    </div>
  );
}
