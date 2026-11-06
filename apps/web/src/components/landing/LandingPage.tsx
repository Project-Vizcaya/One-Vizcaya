import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Download, ArrowRight, ShieldCheck, MapPin, Bell, Cloud, Languages,
  FileCheck2, Siren, Lock, Eye, Users, ChevronDown, Menu, X, Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

// Drop the built APK at apps/web/public/downloads/One-Vizcaya.apk to make this
// live. Build it with `flutter build apk --release --dart-define=FORCE_RECAPTCHA=true`
// so real-number sign-in works on sideloaded installs.
const APK_URL = "/downloads/One-Vizcaya.apk";

const NAV = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how" },
  { label: "Security", href: "#security" },
  { label: "FAQ", href: "#faq" },
];

const FEATURES = [
  { icon: FileCheck2, title: "Verified Reporting", body: "Report road, flood, health and safety issues in minutes — every report tied to a verified resident, never anonymous." },
  { icon: MapPin, title: "GPS + Photo Evidence", body: "Attach your exact location and a photo so the right LGU office can act fast and accurately." },
  { icon: Bell, title: "Real-time Tracking", body: "Follow your report from Reported → Ongoing → Solved, with notifications at every step." },
  { icon: Siren, title: "One-tap PDRRMO SOS", body: "Reach the Provincial Disaster hotline instantly from the home screen during emergencies." },
  { icon: Cloud, title: "Weather & Rainfall Alerts", body: "Local forecasts plus automatic push alerts when heavy rain is expected in your municipality." },
  { icon: Languages, title: "Trilingual & Offline", body: "Works in English, Tagalog and Ilocano, and queues your report offline until you're back online." },
];

const STEPS = [
  { n: "01", title: "Download the App", body: "Get One Vizcaya on your Android phone and pick your municipality." },
  { n: "02", title: "Verify Your Residency", body: "Confirm you're a Nueva Vizcaya resident via GPS at sign-up, or certify with a Barangay Certificate / government ID." },
  { n: "03", title: "Report & Track", body: "Submit a report, watch it get routed to the right office, and rate the resolution." },
];

const TRUST = [
  { icon: ShieldCheck, title: "RA 10173 Compliant", body: "Built to the Data Privacy Act of 2012 and NPC guidance. Photos are stripped of hidden location metadata before upload." },
  { icon: Users, title: "Verified Identity", body: "No anonymous reports — every submission is tied to a verified resident, so LGUs can act with confidence." },
  { icon: Lock, title: "Encrypted & Secured", body: "Data is protected with Google Firebase's enterprise-grade security, with biometric app-lock available." },
  { icon: Eye, title: "Accountable by Design", body: "Barangay → Municipal → Provincial routing with a single accountable owner per report and a full audit trail." },
];

const FAQS = [
  { q: "Is One Vizcaya free to use?", a: "Yes. One Vizcaya is free to download and use for the residents of Nueva Vizcaya." },
  { q: "Who can use the app?", a: "Verified residents of Nueva Vizcaya. You verify by GPS when you register inside the province, or by submitting a Barangay Certificate of Residency or a government ID with your NV address — then you can report from anywhere." },
  { q: "Is my personal information safe?", a: "Yes. The app complies with RA 10173 (Data Privacy Act of 2012). We collect only your phone number and municipality, photos are stripped of hidden EXIF/location data, data is encrypted, and it is never sold." },
  { q: "What languages are supported?", a: "English, Tagalog and Ilocano — switch anytime in Settings." },
  { q: "Do I need internet to file a report?", a: "You can start a report offline; it's queued on your device and submitted automatically once you're back online." },
];

function Brand({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src="/img/seals/nueva-vizcaya.png" alt="Province of Nueva Vizcaya seal" className="h-9 w-9 object-contain" />
      <div className="leading-none">
        <span className="block text-lg font-extrabold tracking-tight text-[hsl(var(--gov-green-800))]">One Vizcaya</span>
        <span className="block text-xs font-medium text-muted-foreground">Isang Boses. Isang Vizcaya.</span>
      </div>
    </div>
  );
}

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Brand />
          <nav className="hidden items-center gap-7 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-[hsl(var(--gov-green-800))]">{n.label}</a>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <Link to="/login" className="text-sm font-medium text-muted-foreground hover:text-[hsl(var(--gov-green-800))]">Admin sign-in</Link>
            <a href={APK_URL}>
              <Button className="gap-2 bg-[hsl(var(--gov-green-800))] hover:bg-[hsl(var(--gov-green-900))]"><Download className="h-4 w-4" /> Download App</Button>
            </a>
          </div>
          <button className="md:hidden" aria-label="Menu" onClick={() => setMenuOpen((v) => !v)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
        {menuOpen && (
          <div className="border-t bg-white px-4 py-3 md:hidden">
            <div className="flex flex-col gap-3">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setMenuOpen(false)} className="text-sm font-medium text-muted-foreground">{n.label}</a>
              ))}
              <Link to="/login" className="text-sm font-medium text-muted-foreground">Admin sign-in</Link>
              <a href={APK_URL}><Button className="w-full gap-2 bg-[hsl(var(--gov-green-800))]"><Download className="h-4 w-4" /> Download App</Button></a>
            </div>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[hsl(var(--gov-green-50))] to-white" />
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--gov-green-800))]/25 bg-white px-3 py-1 text-xs font-semibold text-[hsl(var(--gov-green-800))]">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gov-gold))]" /> Pilot Program · Province of Nueva Vizcaya
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight md:text-5xl">
              Your community issues, <span className="text-[hsl(var(--gov-green-800))]">reported and resolved.</span>
            </h1>
            <p className="mt-4 max-w-lg text-base text-muted-foreground md:text-lg">
              One Vizcaya connects the residents of all 15 municipalities of Nueva Vizcaya directly to their LGUs — report a problem, track it in real time, and get a response.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href={APK_URL}>
                <Button size="lg" className="gap-2 bg-[hsl(var(--gov-green-800))] hover:bg-[hsl(var(--gov-green-900))]"><Download className="h-5 w-5" /> Download for Android</Button>
              </a>
              <a href="#how">
                <Button size="lg" variant="outline" className="gap-2">How it works <ArrowRight className="h-4 w-4" /></Button>
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-sm">
              <Stat value="15" label="Municipalities" />
              <Stat value="3" label="Languages" />
              <Stat value="RA 10173" label="Privacy compliant" />
            </div>
          </div>

          {/* Decorative app panel (no photo dependency) */}
          <div className="relative mx-auto w-full max-w-sm">
            <div className="rounded-[2rem] border bg-white p-5 shadow-2xl">
              <div className="flex items-center gap-2.5 border-b pb-3">
                <img src="/img/seals/nueva-vizcaya.png" alt="" className="h-8 w-8 object-contain" />
                <div>
                  <p className="text-sm font-bold text-[hsl(var(--gov-green-800))]">One Vizcaya</p>
                  <p className="text-xs text-muted-foreground">Connecting you to your municipality</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {[
                  { icon: FileCheck2, t: "Road damage on Purok 3", s: "Ongoing · Bambang" },
                  { icon: Cloud, t: "Heavy rain expected", s: "Weather advisory" },
                  { icon: Check, t: "Streetlight repaired", s: "Solved · Solano" },
                ].map((r, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl border bg-[hsl(var(--gov-green-50))]/60 p-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--gov-green-800))]/10">
                      <r.icon className="h-5 w-5 text-[hsl(var(--gov-green-800))]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{r.t}</p>
                      <p className="text-xs text-muted-foreground">{r.s}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute -right-3 -top-3 -z-10 h-24 w-24 rounded-full bg-[hsl(var(--gov-gold))]/25 blur-2xl" />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <SectionHead eyebrow="Features" title="Everything you need, in one app" sub="Designed for every resident of Nueva Vizcaya — simple, secure, and works on any Android phone." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-white p-6 transition-shadow hover:shadow-md">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[hsl(var(--gov-green-50))]">
                <f.icon className="h-5 w-5 text-[hsl(var(--gov-green-800))]" />
              </div>
              <h3 className="mt-4 text-base font-bold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how" className="border-y bg-[hsl(var(--gov-green-50))]/50">
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-20">
          <SectionHead eyebrow="How It Works" title="Get started in 3 easy steps" sub="From download to your first report — it only takes minutes." />
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="relative rounded-2xl border bg-white p-6">
                <span className="text-3xl font-extrabold text-[hsl(var(--gov-green-800))]/15">{s.n}</span>
                <h3 className="mt-2 text-lg font-bold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section id="security" className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <SectionHead eyebrow="Trust & Security" title="Your data is safe with us" sub="One Vizcaya is built on verified identity, bounded authority, and Philippine data-privacy law." />
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {TRUST.map((t) => (
            <div key={t.title} className="flex gap-4 rounded-2xl border bg-white p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[hsl(var(--gov-green-50))]">
                <t.icon className="h-5 w-5 text-[hsl(var(--gov-green-800))]" />
              </div>
              <div>
                <h3 className="text-base font-bold">{t.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="border-y bg-[hsl(var(--gov-green-50))]/50">
        <div className="mx-auto max-w-3xl px-4 py-16 md:py-20">
          <SectionHead eyebrow="FAQ" title="Frequently asked questions" sub="Everything you need to know about One Vizcaya." />
          <div className="mt-8 space-y-3">
            {FAQS.map((f, i) => {
              const open = openFaq === i;
              return (
                <div key={i} className="overflow-hidden rounded-xl border bg-white">
                  <button className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left" onClick={() => setOpenFaq(open ? null : i)}>
                    <span className="text-sm font-semibold">{f.q}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && <p className="px-5 pb-5 text-sm text-muted-foreground">{f.a}</p>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-[hsl(var(--gov-green-800))] px-6 py-14 text-center text-white md:px-16">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-8 h-44 w-44 rounded-full bg-white/5" />
          <h2 className="relative text-3xl font-extrabold md:text-4xl">Start using One Vizcaya today</h2>
          <p className="relative mx-auto mt-3 max-w-xl text-white/80">Join your neighbors across Nueva Vizcaya. Report an issue and see your barangay respond.</p>
          <div className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
            <a href={APK_URL}>
              <Button size="lg" className="gap-2 bg-white text-[hsl(var(--gov-green-800))] hover:bg-white/90"><Download className="h-5 w-5" /> Download for Android</Button>
            </a>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/30 px-4 py-2 text-sm text-white/80">
              <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--gov-gold))]" /> Coming soon to Google Play
            </span>
          </div>
          <p className="relative mx-auto mt-5 max-w-xl text-xs text-white/60">
            Currently in pilot. Android install requires enabling installs from your browser. iOS coming later.
          </p>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="grid gap-8 md:grid-cols-4">
            <div className="md:col-span-2">
              <Brand />
              <p className="mt-3 max-w-sm text-sm text-muted-foreground">
                A civic-reporting platform connecting the residents of Nueva Vizcaya to their Local Government Units, from the barangay to the Provincial Capitol.
              </p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Product</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href="#features" className="text-muted-foreground hover:text-[hsl(var(--gov-green-800))]">Features</a></li>
                <li><a href="#how" className="text-muted-foreground hover:text-[hsl(var(--gov-green-800))]">How it works</a></li>
                <li><a href="#security" className="text-muted-foreground hover:text-[hsl(var(--gov-green-800))]">Security</a></li>
                <li><a href="#faq" className="text-muted-foreground hover:text-[hsl(var(--gov-green-800))]">FAQ</a></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Access</p>
              <ul className="mt-3 space-y-2 text-sm">
                <li><a href={APK_URL} className="text-muted-foreground hover:text-[hsl(var(--gov-green-800))]">Download app</a></li>
                <li><Link to="/login" className="text-muted-foreground hover:text-[hsl(var(--gov-green-800))]">Admin / LGU sign-in</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 border-t pt-6 text-xs text-muted-foreground">
            <p>
              One Vizcaya is a civic-technology pilot built by the <span className="font-semibold">Project: Vizcaya Team (Nueva Vizcaya State University)</span> and offered to the Provincial Government of Nueva Vizcaya. It is an independent project and is not (yet) an official government platform.
            </p>
            <p className="mt-2">© {2026} Project: Vizcaya · Made for the people of Nueva Vizcaya.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-[hsl(var(--gov-green-800))]">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function SectionHead({ eyebrow, title, sub }: { eyebrow: string; title: string; sub: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--gov-green-800))]">{eyebrow}</p>
      <h2 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
      <p className="mt-3 text-muted-foreground">{sub}</p>
    </div>
  );
}
