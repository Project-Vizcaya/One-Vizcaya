import { DEMO_ACCOUNTS } from "@/lib/session";
import { LoginButtons } from "@/components/LoginButtons";

export default function LoginPage() {
  const operators = DEMO_ACCOUNTS.filter((a) => a.role !== "responder");
  const responders = DEMO_ACCOUNTS.filter((a) => a.role === "responder");
  return (
    <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <div className="h-1 w-5 rounded bg-gov-800" />
          <h1 className="text-xl font-bold">PDRRMO Command Hub</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Nueva Vizcaya · prototype. Pick a demo account. Real sign-in comes with the PDRRMO Portal database.
        </p>
      </div>
      <section className="card p-4 space-y-2">
        <h2 className="text-sm font-bold">Command Hub operators</h2>
        <p className="text-xs text-muted-foreground">Live map, incidents, dispatch, hotline call log.</p>
        <LoginButtons accounts={operators.map((a) => ({ userId: a.userId, name: a.name }))} />
      </section>
      <section className="card p-4 space-y-2">
        <h2 className="text-sm font-bold">Responders</h2>
        <p className="text-xs text-muted-foreground">Open on the crew&apos;s phone: duty, status, location sharing, assignment and navigation.</p>
        <LoginButtons accounts={responders.map((a) => ({ userId: a.userId, name: a.name }))} />
      </section>
    </main>
  );
}
