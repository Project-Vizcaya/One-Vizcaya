import Image from "next/image";
import { DEMO_ACCOUNTS } from "@/lib/session";
import { LoginButtons } from "@/components/LoginButtons";

export default function LoginPage() {
  const operators = DEMO_ACCOUNTS.filter((a) => a.role !== "responder");
  const responders = DEMO_ACCOUNTS.filter((a) => a.role === "responder");
  return (
    <main className="min-h-[calc(100vh-24px)] grid lg:grid-cols-[minmax(320px,420px)_1fr]">
      <section className="bg-gov-900 text-white px-6 py-8 lg:p-10 flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <Image src="/seal.png" alt="Seal of the Province of Nueva Vizcaya" width={56} height={56} priority />
          <div>
            <p className="text-[13px] text-white/75">Province of Nueva Vizcaya</p>
            <h1 className="text-2xl font-bold leading-tight">PDRRMO Command Hub</h1>
          </div>
        </div>
        <p className="text-white/85 leading-relaxed max-w-sm">
          One picture of every response: where the units are, what has been reported by app and by hotline, and who is going where.
        </p>
        <div className="mt-auto rounded-md border border-white/15 bg-white/5 p-3 text-[13px] text-white/80 max-w-sm">
          Prototype with invented data. Real sign-in arrives with the PDRRMO Portal database.
        </div>
      </section>

      <section className="px-4 py-8 sm:px-8 lg:p-10 space-y-8 max-w-3xl w-full">
        <div>
          <h2 className="text-lg font-bold">Sign in with a demo account</h2>
          <p className="hint mt-1">Open a responder account on a second phone or browser to see both sides of a dispatch.</p>
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="section-title">Command Hub operators</h3>
            <p className="hint">Live map, incidents, dispatch, hotline call log.</p>
          </div>
          <LoginButtons accounts={operators.map((a) => ({ userId: a.userId, name: a.name, detail: a.role === "mdrrmo" ? `Sees ${a.municipality} only` : "Sees the whole province" }))} />
        </div>
        <div className="space-y-3">
          <div>
            <h3 className="section-title">Responder crews</h3>
            <p className="hint">Open on the crew&apos;s phone: duty, status, location, assignment and navigation.</p>
          </div>
          <LoginButtons accounts={responders.map((a) => ({ userId: a.userId, name: a.name.replace(" crew (demo)", ""), detail: "Crew sign-in" }))} mono />
        </div>
      </section>
    </main>
  );
}
