"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LoginButtons({ accounts }: { accounts: { userId: string; name: string }[] }) {
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
        <button key={a.userId} className="btn justify-start" disabled={busy !== null} onClick={() => go(a.userId)}>
          {busy === a.userId ? "Signing in…" : a.name}
        </button>
      ))}
      {error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{error}</p>}
    </div>
  );
}
