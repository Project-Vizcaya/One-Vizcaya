import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Download, Phone as PhoneIcon, ShieldCheck, MapPin, Menu, X, ArrowRight,
  EyeOff, Shuffle, Timer, UserCheck, Archive, Users, FileText, Mail,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Phone, ReportScreen, MapScreen, AlertsScreen, SosScreen } from "./Phone";
import { MunicipalityMap } from "./MunicipalityMap";

// Drop the built APK at apps/web/public/downloads/One-Vizcaya.apk to make this
// live (see public/downloads/README.md).
const APK_URL = "/downloads/One-Vizcaya.apk";

// 911 is the national emergency hotline. The PDRRMO direct line is still a
// placeholder (docs/hotline-verification.md) — never put an unverified number
// behind a tel: link.
const EMERGENCY_TEL = "tel:911";
const PDRRMO_HOTLINE = "[PDRRMO hotline]";
const CONTACT_EMAIL = "[team email]";

// Pilot LGUs: list names exactly as in src/data/municipalities.ts once
// confirmed. Leave empty until then — don't invent partners.
const PILOT_LGUS: string[] = [];

const NAV = [
  { label: "How it works", href: "#flow" },
  { label: "Features", href: "#features" },
  { label: "Coverage", href: "#coverage" },
  { label: "Privacy", href: "#privacy" },
];

const SECTIONS = ["problem", "flow", "features", "coverage", "privacy", "endorsement"];

const PROBLEMS = [
  { icon: EyeOff, title: "Hazards go unreported", body: "A blocked drainage canal or a cracked slope is easy to walk past. Without a simple way to report it, the barangay finds out only after it becomes an emergency." },
  { icon: Shuffle, title: "Reports get lost between offices", body: "A concern raised at the barangay hall has to travel to the municipality and then the Province — by phone, paper or chat. Details and photos drop off along the way." },
  { icon: Timer, title: "Emergency handoffs are slow", body: "When responders have to ask “where exactly?” and “what happened?”, minutes are lost before anyone is dispatched." },
];

const STEPS = [
  { title: "Resident submits", body: "A verified resident files a report with a photo, GPS location and category." },
  { title: "Municipal review & approval", body: "The municipal LGU checks the report and acts on it, or approves it for escalation." },
  { title: "Provincial / PDRRMO action", body: "Only municipally-approved escalations reach the Province and PDRRMO." },
  { title: "Resident gets updates", body: "The resident is notified at each status change, from Reported to Resolved." },
];

const FEATURES = [
  { id: "report", label: "Report", title: "Report in under a minute", body: "Pick a category, take a live photo and let GPS fill in the location. Reports are tied to your verified account, so LGUs can act on them with confidence.", points: ["Live-camera photos are GPS-stamped", "Categories set the priority (e.g. Disaster & Risk Management)", "Saved offline and sent when you're back online"], screen: <ReportScreen /> },
  { id: "map", label: "Live map", title: "See reports across the province", body: "LGU staff see reports on one map, filtered by municipality and status, so the busiest areas stand out.", points: ["Filter by municipality and status", "Each report has one accountable office", "Exportable records for after-action reports"], screen: <MapScreen /> },
  { id: "alerts", label: "Alerts", title: "Provincial advisories, pushed to you", body: "Approved advisories from the Province — rainfall warnings, road closures — arrive as push notifications for the municipalities they affect.", points: ["Scoped to the affected municipalities", "Alerts are approved before they are sent", "Status updates on your own reports"], screen: <AlertsScreen /> },
  { id: "sos", label: "One-tap PDRRMO", title: "One tap to the Provincial Disaster office", body: "During an emergency, a single button on the home screen reaches PDRRMO and shares your location with responders.", points: ["Reachable from the home screen", "Location shared with the responder", "Local BFP and DRRMO contacts listed"], screen: <SosScreen /> },
];

const ROLES = [
  { role: "Resident", sees: "Your own reports and their status, plus public advisories." },
  { role: "Barangay / Municipal LGU", sees: "Reports filed in their own barangay or municipality only." },
  { role: "Provincial (PA, PDRRMO)", sees: "Only reports the municipality has approved for escalation." },
];

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const active = useActiveSection(SECTIONS);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow">
        Skip to content
      </a>

      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <a href="#top" className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]">
            <Wordmark />
          </a>
          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-sm font-medium text-slate-600 hover:text-[#166534]">{n.label}</a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a href={APK_URL} className="btn-primary hidden sm:inline-flex"><Download className="h-4 w-4" aria-hidden="true" /> Download app</a>
            <a href={EMERGENCY_TEL} className="btn-emergency"><PhoneIcon className="h-4 w-4" aria-hidden="true" /> Emergency</a>
            <button
              type="button"
              className="rounded p-1.5 lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#166534]"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-nav" aria-label="Main" className="border-t bg-white px-4 py-3 lg:hidden">
            <ul className="flex flex-col gap-1">
              {NAV.map((n) => (
                <li key={n.href}>
                  <a href={n.href} onClick={() => setMenuOpen(false)} className="block rounded px-2 py-2 font-medium text-slate-700 hover:bg-slate-50">{n.label}</a>
                </li>
              ))}
              <li className="pt-2 sm:hidden">
                <a href={APK_URL} className="btn-primary w-full justify-center"><Download className="h-4 w-4" aria-hidden="true" /> Download app</a>
              </li>
            </ul>
          </nav>
        )}
      </header>

      {/* ── Section indicator (desktop) ── */}
      <div aria-hidden="true" className="fixed right-6 top-1/2 z-30 hidden -translate-y-1/2 flex-col items-center gap-3 xl:flex">
        <span className="text-xs font-bold tabular-nums text-[#166534]">
          {active >= 0 ? `${pad(active + 1)} / ${pad(SECTIONS.length)}` : `— / ${pad(SECTIONS.length)}`}
        </span>
        <div className="flex flex-col gap-1.5">
          {SECTIONS.map((s, i) => (
            <span key={s} className={`h-6 w-1 rounded-full transition-colors ${i === active ? "bg-[#166534]" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      <main id="main">
        {/* ── Hero ── */}
        <section id="top" className="relative overflow-hidden bg-gradient-to-b from-[#f0fdf4] to-white">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
            <div>
              <p className="text-sm font-semibold text-[#166534]">Para sa bawat barangay ng Nueva Vizcaya</p>
              <h1 className="mt-3 text-[2.6rem] font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
                <span className="block sm:inline">Report.</span>{" "}
                <span className="block sm:inline">Respond.</span>{" "}
                <span className="block text-[#166534] sm:inline">Recover.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-slate-600">
                One Vizcaya connects every barangay to the Province — so hazards get reported, verified and acted on faster.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={APK_URL} className="btn-primary btn-lg"><Download className="h-5 w-5" aria-hidden="true" /> Download the app</a>
                <a href={EMERGENCY_TEL} className="btn-emergency-outline btn-lg"><PhoneIcon className="h-5 w-5" aria-hidden="true" /> Emergency hotline</a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-2 text-xs font-semibold text-slate-700">
                <li className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5"><MapPin className="h-3.5 w-3.5 text-[#166534]" aria-hidden="true" /> Built in Nueva Vizcaya</li>
                <li className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-[#166534]" aria-hidden="true" /> RA 10173 compliant</li>
              </ul>
            </div>
            <Phone label="One Vizcaya app: the Report a problem screen with category, photo, GPS location and description fields">
              <ReportScreen />
            </Phone>
          </div>
        </section>

        {/* ── 01 Problem ── */}
        <Section id="problem" n={1} eyebrow="The problem" title="Concerns get stuck between the barangay and the Province">
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PROBLEMS.map((p) => (
              <div key={p.title} className="rounded-2xl border bg-white p-6">
                <p.icon className="h-6 w-6 text-[#166534]" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-bold">{p.title}</h3>
                <p className="mt-2 text-slate-600">{p.body}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── 02 Flow ── */}
        <Section id="flow" n={2} eyebrow="How a report flows" title="Every report has one clear path — and one accountable office" tinted>
          <ol className="mt-10 grid gap-4 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 md:flex-col">
                <div className="flex flex-col items-center md:flex-row">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#166534] font-bold text-white">{i + 1}</span>
                  {i < STEPS.length - 1 && <span aria-hidden="true" className="w-0.5 flex-1 bg-[#166534]/25 md:h-0.5 md:w-auto md:flex-1 md:ml-3" />}
                </div>
                <div className={`pb-6 md:pb-0 ${i === 1 ? "rounded-xl border-2 border-[#166534]/30 bg-white p-4 -mt-2 md:mt-0" : ""}`}>
                  <h3 className="font-bold">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{s.body}</p>
                  {i === 1 && <p className="mt-2 text-xs font-semibold text-[#166534]">Approval gate: nothing reaches the Province without it.</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* ── 03 Features ── */}
        <Section id="features" n={3} eyebrow="Features" title="What the app does">
          <Tabs defaultValue="report" className="mt-10">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-slate-100 p-1 sm:w-fit">
              {FEATURES.map((f) => (
                <TabsTrigger key={f.id} value={f.id} className="px-4 py-2 text-sm data-[state=active]:text-[#166534]">{f.label}</TabsTrigger>
              ))}
            </TabsList>
            {FEATURES.map((f) => (
              <TabsContent key={f.id} value={f.id} className="mt-8">
                <div className="grid items-center gap-10 md:grid-cols-2">
                  <div>
                    <h3 className="text-2xl font-bold">{f.title}</h3>
                    <p className="mt-3 text-slate-600">{f.body}</p>
                    <ul className="mt-5 space-y-2">
                      {f.points.map((pt) => (
                        <li key={pt} className="flex gap-2 text-slate-700"><span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#166534]" />{pt}</li>
                      ))}
                    </ul>
                  </div>
                  <Phone label={`One Vizcaya app: ${f.label} screen`}>{f.screen}</Phone>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </Section>

        {/* ── 04 Coverage ── */}
        <Section id="coverage" n={4} eyebrow="Coverage" title="All 15 municipalities of Nueva Vizcaya" tinted>
          <div className="mt-10 grid items-start gap-10 md:grid-cols-2">
            <div className="rounded-2xl border bg-white p-4">
              <MunicipalityMap titled highlight={PILOT_LGUS} className="mx-auto h-auto max-h-[420px] w-full max-w-md" />
              <p className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <span aria-hidden="true" className="inline-block h-3 w-3 rounded-sm bg-[#166534]" /> Pilot LGU
                {PILOT_LGUS.length === 0 && <span>— [Pilot LGU] to be announced</span>}
              </p>
            </div>
            <div>
              <p className="text-slate-600">
                One Vizcaya serves Nueva Vizcaya only. When you register, your phone's GPS confirms you are inside the province.
                Residents can also verify with a Barangay Certificate of Residency or a government ID with an NV address.
              </p>
              <p className="mt-3 text-slate-600">
                Reports are routed to the municipality and barangay where they happen, so each one lands with the office that can act on it.
              </p>
              <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-3">
                {[...MUNICIPALITIES].map((m) => m.name).sort().map((name) => (
                  <li key={name} className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#166534]" aria-hidden="true" />
                    {name}
                    {PILOT_LGUS.includes(name) && <span className="text-xs font-semibold text-[#166534]">(pilot)</span>}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>

        {/* ── 05 Privacy ── */}
        <Section id="privacy" n={5} eyebrow="Trust & privacy" title="Accountable reporting, protected data">
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Card icon={UserCheck} title="Verified, not anonymous">Every report is tied to a verified Nueva Vizcaya resident. This keeps false and prank reports out, so LGUs can act with confidence.</Card>
            <Card icon={ShieldCheck} title="RA 10173 compliant">Built to the Data Privacy Act of 2012. Photos are stripped of hidden metadata before upload, and you can request or download your data from the app.</Card>
            <Card icon={Archive} title="Archived, not erased">Reports are official LGU records. If you delete your account, your personal profile is removed and your reports are archived — not silently deleted.</Card>
          </div>
          <div className="mt-8 overflow-hidden rounded-2xl border">
            <div className="flex items-center gap-2 border-b bg-slate-50 px-5 py-3">
              <Users className="h-4 w-4 text-[#166534]" aria-hidden="true" />
              <h3 className="font-bold">Who can see what</h3>
            </div>
            <dl className="divide-y">
              {ROLES.map((r) => (
                <div key={r.role} className="grid gap-1 px-5 py-3 sm:grid-cols-[14rem_1fr]">
                  <dt className="font-semibold">{r.role}</dt>
                  <dd className="text-slate-600">{r.sees}</dd>
                </div>
              ))}
            </dl>
          </div>
          <Link to="/privacy" className="mt-6 inline-flex items-center gap-1.5 font-semibold text-[#166534] underline-offset-4 hover:underline">
            Read the full Data Privacy Notice <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Section>

        {/* ── 06 Endorsement ── */}
        <Section id="endorsement" n={6} eyebrow="Endorsement & partners" title="Reviewed by the Province" tinted>
          <div className="mt-8 max-w-3xl space-y-3 text-slate-700">
            <p>
              One Vizcaya was presented to the Provincial Technical Review Committee on June 10, 2026, and endorsed by the
              Office of the Provincial Administrator (Endorsement Ref. No. G-373, June 11, 2026).
            </p>
            <p>The committee's feedback — including PDRRMO's — shaped how reports are reviewed by the municipality before they are escalated to the Province.</p>
          </div>
          {/*
            Provincial seal / LGU logos go here ONLY once written permission is on file.
            <div className="mt-8 flex flex-wrap items-center gap-6">
              <img src="/img/seals/nueva-vizcaya.png" alt="Province of Nueva Vizcaya" className="h-16 w-16" loading="lazy" />
            </div>
          */}
        </Section>

        {/* ── Closing CTA ── */}
        <section className="px-4 py-16 md:py-20">
          <div className="mx-auto max-w-6xl rounded-3xl bg-[#166534] px-6 py-14 text-center text-white md:px-16">
            <h2 className="text-3xl font-extrabold md:text-4xl">Is your barangay ready?</h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">Download the app to start reporting, or contact the team to bring One Vizcaya to your LGU.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <a href={APK_URL} className="btn-lg inline-flex items-center gap-2 rounded-lg bg-white px-5 font-semibold text-[#166534] hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#166534]">
                <Download className="h-5 w-5" aria-hidden="true" /> Download app
              </a>
              <a href="#contact" className="btn-lg inline-flex items-center gap-2 rounded-lg border border-white/60 px-5 font-semibold text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#166534]">
                <Mail className="h-5 w-5" aria-hidden="true" /> Contact the team
              </a>
            </div>
            <p className="mt-5 text-xs text-white/75">Android app, currently in pilot. Google Play and iOS to follow.</p>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t bg-slate-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-3">
          <div>
            <Wordmark />
            <p className="mt-3 text-sm text-slate-600">Civic reporting for Nueva Vizcaya — from the barangay to the Provincial Capitol.</p>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">Emergency hotlines</h2>
            <ul className="mt-3 space-y-2 text-sm">
              <li><a href={EMERGENCY_TEL} className="font-semibold text-red-700 hover:underline">National emergency: 911</a></li>
              <li className="text-slate-700">PDRRMO Nueva Vizcaya: {PDRRMO_HOTLINE}</li>
            </ul>
          </div>
          <div id="contact">
            <h2 className="text-xs font-bold uppercase tracking-wide text-slate-600">About</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              <li><Link to="/privacy" className="hover:text-[#166534] hover:underline">Data Privacy Notice</Link></li>
              <li><span>Terms of Use [coming soon]</span></li>
              <li className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" aria-hidden="true" /> {CONTACT_EMAIL}</li>
              <li><Link to="/login" className="hover:text-[#166534] hover:underline">LGU staff sign-in</Link></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-6xl border-t px-4 py-6 text-xs text-slate-600">
          <p className="flex items-start gap-1.5"><FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" /> Developed by Aaron Anthony A. Gano II, Sean Godric Reyes and Darius Acosta (Project: Vizcaya Team).</p>
          <p className="mt-2">© 2026 One Vizcaya · Made for the people of Nueva Vizcaya.</p>
        </div>
      </footer>
    </div>
  );
}

function Wordmark() {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#166534] text-white">
        <MapPin className="h-4 w-4" />
      </span>
      <span className="text-lg font-extrabold tracking-tight text-[#166534]">One Vizcaya</span>
    </span>
  );
}

function Section({ id, n, eyebrow, title, tinted = false, children }: { id: string; n: number; eyebrow: string; title: string; tinted?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-16 ${tinted ? "border-y bg-[#f0fdf4]/60" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <p className="text-sm font-bold text-[#166534]"><span className="tabular-nums">{pad(n)}</span> — {eyebrow}</p>
        <h2 id={`${id}-title`} className="mt-2 max-w-3xl text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-6">
      <Icon className="h-6 w-6 text-[#166534]" aria-hidden="true" />
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-2 text-slate-600">{children}</p>
    </div>
  );
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

// Index of the section currently in the middle of the viewport (-1 = hero).
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(-1);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(ids.indexOf(e.target.id));
      },
      { rootMargin: "-50% 0px -50% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    const onScroll = () => { if (window.scrollY < 200) setActive(-1); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, [ids]);
  return active;
}
