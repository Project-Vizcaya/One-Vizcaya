import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Download, Phone as PhoneIcon, ShieldCheck, ArrowRight, EyeOff, Shuffle, Timer, UserCheck, Archive, Users,
  WifiOff, Languages,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MUNICIPALITIES } from "@/data/municipalities";
import { Phone, ReportScreen, MapScreen, AlertsScreen, SosScreen } from "./Phone";
import { MunicipalityMap, townLabel } from "./MunicipalityMap";
import { APK_AVAILABLE, APK_SIZE_MB, APK_URL, PDRRMO_HOTLINE, PDRRMO_TEL, SiteFooter, SiteHeader } from "./SiteChrome";

// Design contract: docs/design-system.md. Provincial green, gold as the one
// accent (the approval step, the capital on the map, the download button on
// green, the active nav link), red only for emergency calls.

// Pilot LGUs: list names exactly as in src/data/municipalities.ts once
// confirmed. Leave empty until then — don't invent partners.
const PILOT_LGUS: string[] = [];

const NAV = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Coverage", href: "#coverage" },
  { label: "Privacy", href: "#privacy" },
];

const PROBLEMS = [
  { icon: EyeOff, title: "Hazards go unreported", body: "A blocked drainage canal or a cracked slope is easy to walk past. Without a simple way to report it, the barangay finds out only after it becomes an emergency." },
  { icon: Shuffle, title: "Reports get lost between offices", body: "A concern raised at the barangay hall travels to the municipality and then the Province by phone, paper or chat. Details and photos drop off along the way." },
  { icon: Timer, title: "Emergency handoffs are slow", body: "When responders have to ask “where exactly?” and “what happened?”, minutes are lost before anyone is dispatched." },
];

const STEPS = [
  { who: "You", title: "You send a report", body: "With a photo, your location and the type of problem. Your account is verified, so the LGU knows the report is real." },
  { who: "Your municipality", title: "Your town hall checks it", body: "The municipal LGU reviews every report first. It acts on it, or forwards it to the Province when provincial help is needed.", gate: true },
  { who: "Province · PDRRMO", title: "The Province steps in if needed", body: "The Provincial Government and the PDRRMO (Provincial Disaster Risk Reduction and Management Office) receive only the reports your municipality forwards." },
  { who: "You", title: "You get updates", body: "A notification each time the status changes, from Reported to Resolved." },
];

const FEATURES = [
  {
    id: "alerts", label: "Alerts", title: "Advisories for your town, pushed to you",
    body: "Approved advisories from the Province, like rainfall warnings and road closures, arrive as notifications for the municipalities they affect.",
    points: ["Only for the towns an advisory covers", "Every alert is approved before it is sent", "Status updates on your own reports"],
    screen: <AlertsScreen />,
  },
  {
    id: "sos", label: "Emergency SOS", title: "One tap to call PDRRMO",
    body: `Press the red SOS button on the app's home screen. Your phone calls the PDRRMO hotline (${PDRRMO_HOTLINE}) and shares your live location with responders until you turn SOS off.`,
    points: ["It is a normal phone call, so you need signal and load", "Your live location is shared only while SOS is on", "Other emergency hotlines are listed in the app"],
    note: "One Vizcaya does not replace 911, the PDRRMO hotline, radio, or your barangay officials. In a real emergency, still call them.",
    screen: <SosScreen />,
  },
  {
    id: "map", label: "For LGU staff", title: "One map of reports for LGU staff",
    body: "Municipal and provincial staff see the reports in their area on one map, by status, so the busiest places stand out and nothing waits unseen.",
    points: ["Each report has one accountable office", "Filter by municipality and status", "Records for after-action reports"],
    screen: <MapScreen />,
  },
];

const ROLES = [
  { role: "You (resident)", sees: "Your own reports and their status, plus public advisories." },
  { role: "Your barangay or municipal LGU", sees: "Reports filed in their own barangay or municipality only." },
  { role: "Provincial Government (Provincial Administrator's Office, PDRRMO)", sees: "Only reports your municipality has forwarded to the Province." },
];

export function LandingPage() {
  const active = useActiveSection(NAV.map((n) => n.href.slice(1)));
  const [tab, setTab] = useState(FEATURES[0].id);
  const current = FEATURES.find((f) => f.id === tab) ?? FEATURES[0];
  const towns = [...MUNICIPALITIES].map((m) => townLabel(m.name)).sort((a, b) => a.localeCompare(b));

  return (
    <div className="site min-h-screen bg-white">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:font-bold">
        Skip to content
      </a>
      <SiteHeader nav={NAV} active={active} />

      <main id="main">
        {/* ── Hero ── */}
        <section id="top" className="border-b border-[var(--site-line)]">
          <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-10 md:grid-cols-[1.15fr_1fr] md:py-16">
            <div className="min-w-0">
              <p lang="fil" className="text-[15px] font-bold text-[var(--site-green-600)]">Para sa bawat barangay ng Nueva Vizcaya</p>
              <h1 className="mt-3 text-balance break-words text-[clamp(1.9rem,9.5vw,2.5rem)] font-extrabold leading-[1.08] text-[var(--site-ink)] sm:text-[3.4rem]">
                See a hazard? <span className="text-[var(--site-green)]">Report it to your municipality.</span>
              </h1>
              <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-[var(--site-muted)]">
                Take a photo of a clogged canal, a landslide or a damaged road anywhere from Kasibu to Kayapa. One Vizcaya adds the
                location, sends it to your town hall, and tells you each time its status changes.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href="#download" className="btn-primary btn-lg"><Download className="h-5 w-5" aria-hidden="true" /> Get the app</a>
                <a href="#how" className="btn-ghost btn-lg">How it works <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
              </div>
              <p className="mt-4 text-[15px] text-[var(--site-muted)]">For residents of Nueva Vizcaya · Android · English, Tagalog, Ilocano</p>

              <div role="note" aria-labelledby="call-first" className="mt-7 max-w-xl rounded-md border border-red-200 bg-red-50 p-4">
                <p id="call-first" className="text-[17px] font-extrabold text-red-800">Emergency? Call first.</p>
                <p className="mt-1 text-[15px] text-[var(--site-ink)]">
                  If a life or property is in danger right now, call. You can report in the app afterwards.
                  <span className="text-[var(--site-muted)]"> <span lang="fil">Tumawag muna.</span> · <span lang="ilo">Umuna ti agtawag.</span></span>
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <a href="tel:911" className="btn-emergency"><PhoneIcon className="h-4 w-4" aria-hidden="true" /> Call 911</a>
                  <a href={PDRRMO_TEL} className="btn-emergency-outline"><PhoneIcon className="h-4 w-4" aria-hidden="true" /> PDRRMO {PDRRMO_HOTLINE}</a>
                </div>
              </div>

              <p className="mt-6 max-w-xl border-l-4 border-[var(--site-gold)] pl-3 text-[15px] text-[var(--site-ink)]">
                Endorsed by the Office of the Provincial Administrator, Nueva Vizcaya
                <span className="text-[var(--site-muted)]"> · Ref. No. G-373 · June 11, 2026</span>
              </p>
            </div>
            <Phone label="One Vizcaya app: the Report a problem screen with category, photo, GPS location and description fields">
              <ReportScreen />
            </Phone>
          </div>
        </section>

        {/* ── The problem ── */}
        <Section id="problem" eyebrow="Why it matters" title="Concerns get stuck between the barangay and the Province">
          <ul className="mt-8 divide-y divide-[var(--site-line)] border-y border-[var(--site-line)]">
            {PROBLEMS.map((p) => (
              <li key={p.title} className="grid gap-2 py-5 md:grid-cols-[20rem_1fr] md:gap-10">
                <h3 className="flex items-center gap-2.5 text-lg font-bold">
                  <p.icon className="h-5 w-5 shrink-0 text-[var(--site-green-600)]" aria-hidden="true" /> {p.title}
                </h3>
                <p className="max-w-2xl text-[17px] leading-relaxed text-[var(--site-muted)]">{p.body}</p>
              </li>
            ))}
          </ul>
        </Section>

        {/* ── How it works: the page's one tinted band ── */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-16 bg-[var(--site-green-50)]">
          <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
            <SectionHead id="how" eyebrow="How it works" title="Every report has one clear path, and one office that answers for it" />
            <ol className="mt-10 grid gap-x-6 gap-y-2 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="flex gap-4 md:flex-col md:gap-3">
                  <div className="flex flex-col items-center md:flex-row">
                    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-extrabold ${
                      s.gate ? "bg-[var(--site-gold)] text-[#1F1600]" : "bg-[var(--site-green)] text-white"}`}>{i + 1}</span>
                    {i < STEPS.length - 1 && <span aria-hidden="true" className="w-0.5 flex-1 bg-[var(--site-green)]/20 md:ml-3 md:h-0.5 md:w-auto" />}
                  </div>
                  <div className="pb-7 md:pb-0">
                    <p className="text-sm font-bold uppercase tracking-wide text-[var(--site-green-600)]">{s.who}</p>
                    <h3 className="mt-0.5 text-lg font-bold">{s.title}</h3>
                    <p className="mt-1 text-[15px] leading-relaxed text-[var(--site-muted)]">{s.body}</p>
                    {s.gate && (
                      <p className="mt-2 inline-block rounded-sm bg-[var(--site-gold-soft)] px-2 py-1 text-sm font-bold text-[#5B4300]">
                        Every report is checked by your municipality first.
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-[15px] text-[var(--site-ink)]">
              <li className="flex items-center gap-2"><WifiOff className="h-4 w-4 text-[var(--site-green-600)]" aria-hidden="true" /> No signal? Reports are saved and sent when you're back online.</li>
              <li className="flex items-center gap-2"><Languages className="h-4 w-4 text-[var(--site-green-600)]" aria-hidden="true" /> In English, Tagalog and Ilocano.</li>
            </ul>
          </div>
        </section>

        {/* ── Features ── */}
        <Section id="features" eyebrow="Features" title="Beyond reporting">
          <Tabs value={tab} onValueChange={setTab} className="mt-8">
            <div className="grid items-start gap-10 md:grid-cols-[1fr_260px] lg:gap-20">
              <div className="min-w-0">
                <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-md bg-[var(--site-paper)] p-1 sm:inline-grid sm:w-auto">
                  {FEATURES.map((f) => (
                    <TabsTrigger key={f.id} value={f.id}
                      className="min-h-[48px] rounded-[5px] px-3 text-[15px] font-bold text-[var(--site-muted)] data-[state=active]:bg-[var(--site-green)] data-[state=active]:text-white sm:px-5">
                      {f.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {FEATURES.map((f) => (
                  <TabsContent key={f.id} value={f.id} className="mt-7 focus-visible:outline-none">
                    <h3 className="text-2xl font-extrabold">{f.title}</h3>
                    <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-[var(--site-muted)]">{f.body}</p>
                    <ul className="mt-5 space-y-2.5">
                      {f.points.map((pt) => (
                        <li key={pt} className="flex gap-2.5 text-[16px] text-[var(--site-ink)]">
                          <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--site-green-600)]" />{pt}
                        </li>
                      ))}
                    </ul>
                    {f.note && <p className="mt-5 max-w-xl border-l-4 border-red-700 pl-3 text-[15px] text-[var(--site-ink)]">{f.note}</p>}
                    <div className="mt-8 md:hidden"><Phone label={`One Vizcaya app: ${f.label} screen`}>{f.screen}</Phone></div>
                  </TabsContent>
                ))}
              </div>
              <div className="hidden md:block">
                <Phone label={`One Vizcaya app: ${current.label} screen`}>{current.screen}</Phone>
              </div>
            </div>
          </Tabs>
        </Section>

        {/* ── Coverage ── */}
        <Section id="coverage" eyebrow="Coverage" title="Made for all 15 municipalities of Nueva Vizcaya" muted>
          <div className="mt-8 grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <MunicipalityMap titled labels capitol highlight={PILOT_LGUS} className="mx-auto h-auto max-h-[520px] w-full max-w-lg" />
            <div>
              <p className="text-[17px] leading-relaxed text-[var(--site-muted)]">
                One Vizcaya serves Nueva Vizcaya only. When you register, your phone's location confirms you are inside the province.
                You can also verify with a Barangay Certificate of Residency or a government ID with a Nueva Vizcaya address.
              </p>
              <p className="mt-3 text-[17px] leading-relaxed text-[var(--site-muted)]">
                Each report goes to the municipality and barangay where it happened, so it lands with the office that can act on it.
              </p>
              <ul className="mt-6 columns-2 gap-x-6 text-base leading-8 sm:columns-3">
                {towns.map((name) => (
                  <li key={name} className="break-inside-avoid">
                    {name}{PILOT_LGUS.includes(name) && <span className="ml-1 text-sm font-bold text-[var(--site-green-600)]">(pilot)</span>}
                  </li>
                ))}
              </ul>
              <p className="mt-5 flex items-center gap-2 text-[15px] text-[var(--site-muted)]">
                <span aria-hidden="true" className="inline-block h-3 w-3 rounded-full border-2 border-[var(--site-green)] bg-[var(--site-gold)]" />
                Bayombong, the Provincial Capitol
              </p>
              {PILOT_LGUS.length === 0 && (
                <p className="mt-2 text-[15px] text-[var(--site-muted)]">Now in pilot. The first pilot municipality will be announced here.</p>
              )}
            </div>
          </div>
        </Section>

        {/* ── Trust & privacy ── */}
        <Section id="privacy" eyebrow="Privacy" title="Accountable reporting, protected data">
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card icon={UserCheck} title="Verified, not anonymous">Every report is tied to a verified Nueva Vizcaya resident. This keeps false and prank reports out, so LGUs can act with confidence.</Card>
            <Card icon={ShieldCheck} title="Built for the Data Privacy Act">Made to follow the Data Privacy Act of 2012 (RA 10173). Photos are stripped of hidden metadata before upload, and you can request or download your data from the app.</Card>
            <Card icon={Archive} title="Archived, not erased">Reports are official LGU records. If you delete your account, your personal profile is removed and your reports are archived, not silently deleted.</Card>
          </div>
          <div className="mt-6 overflow-hidden rounded-md border border-[var(--site-line)]">
            <h3 className="flex items-center gap-2 border-b border-[var(--site-line)] bg-[var(--site-paper)] px-5 py-3 font-bold">
              <Users className="h-4 w-4 text-[var(--site-green-600)]" aria-hidden="true" /> Who can see what
            </h3>
            <dl className="divide-y divide-[var(--site-line)]">
              {ROLES.map((r) => (
                <div key={r.role} className="grid gap-1 px-5 py-3.5 sm:grid-cols-[19rem_1fr] sm:gap-6">
                  <dt className="font-bold">{r.role}</dt>
                  <dd className="text-[var(--site-muted)]">{r.sees}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div id="endorsement" className="mt-10 grid gap-6 border-t border-[var(--site-line)] pt-8 md:grid-cols-[20rem_1fr]">
            <h3 className="text-lg font-bold">Reviewed by the Province</h3>
            <div className="max-w-2xl space-y-3 text-[17px] leading-relaxed text-[var(--site-muted)]">
              <p>
                One Vizcaya was presented to the Provincial Technical Review Committee on June 10, 2026, and endorsed by the Office of the
                Provincial Administrator (Endorsement Ref. No. G-373, June 11, 2026). The committee's feedback, including PDRRMO's, shaped how
                every report is checked by the municipality before it goes to the Province.
              </p>
              <Link to="/privacy" className="inline-flex min-h-[44px] items-center gap-1.5 font-bold text-[var(--site-green)] underline-offset-4 hover:underline">
                Read the full Data Privacy Notice <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </Section>

        {/* ── Download ── */}
        <section id="download" aria-labelledby="download-title" className="on-dark scroll-mt-16 bg-[var(--site-green)] text-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-[1fr_auto] md:items-center md:py-20">
            <div>
              <p className="inline-block rounded-sm bg-[var(--site-gold)] px-2 py-0.5 text-sm font-bold text-[#1F1600]">Pilot</p>
              <h2 id="download-title" className="mt-3 text-balance text-3xl font-extrabold md:text-[2.5rem] md:leading-tight">Get One Vizcaya on your Android phone</h2>
              <p className="mt-3 max-w-xl text-[17px] text-white/85">
                Free, in English, Tagalog and Ilocano. Not yet on Google Play or the iPhone App Store.
              </p>
              <ol className="mt-6 max-w-xl list-decimal space-y-2 pl-5 text-[16px] text-white/90 marker:font-bold marker:text-[var(--site-gold)]">
                <li>Download the app file (APK){APK_SIZE_MB ? `, about ${APK_SIZE_MB} MB; use Wi-Fi if your data is limited` : ""}.</li>
                <li>Open the downloaded file. If your phone asks, allow your browser to install unknown apps. This is normal for apps that are not on Google Play.</li>
                <li>Open One Vizcaya and sign in with your mobile number.</li>
              </ol>
            </div>
            <div className="flex flex-col items-start gap-3 md:items-center">
              {APK_AVAILABLE ? (
                <a href={APK_URL} download className="btn-gold btn-lg text-[17px]">
                  <Download className="h-5 w-5" aria-hidden="true" /> Download for Android{APK_SIZE_MB ? ` (${APK_SIZE_MB} MB)` : ""}
                </a>
              ) : (
                <p className="max-w-xs text-[17px] font-bold text-white">The Android download will open here when the pilot starts.</p>
              )}
              <Link to="/login" className="inline-flex min-h-[44px] items-center text-[15px] font-semibold text-white/85 underline-offset-4 hover:text-white hover:underline">LGU staff? Sign in here</Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function SectionHead({ id, eyebrow, title }: { id: string; eyebrow: string; title: string }) {
  return (
    <>
      <p className="flex items-center gap-2 text-[15px] font-bold text-[var(--site-green-600)]">
        <span aria-hidden="true" className="h-[3px] w-6 rounded bg-[var(--site-gold)]" />{eyebrow}
      </p>
      <h2 id={`${id}-title`} className="mt-2 max-w-3xl text-balance text-3xl font-extrabold leading-tight md:text-[2.4rem]">{title}</h2>
    </>
  );
}

function Section({ id, eyebrow, title, muted = false, children }: { id: string; eyebrow: string; title: string; muted?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className={`scroll-mt-16 ${muted ? "bg-[var(--site-paper)]" : ""}`}>
      <div className="mx-auto max-w-6xl px-4 py-14 md:py-20">
        <SectionHead id={id} eyebrow={eyebrow} title={title} />
        {children}
      </div>
    </section>
  );
}

function Card({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[var(--site-line)] bg-white p-5">
      <Icon className="h-6 w-6 text-[var(--site-green-600)]" aria-hidden="true" />
      <h3 className="mt-3 text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--site-muted)]">{children}</p>
    </div>
  );
}

// The section in the middle of the viewport, for the header's active link.
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  const key = ids.join(",");
  useEffect(() => {
    const els = key.split(",").map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    const obs = new IntersectionObserver(
      (entries) => { for (const e of entries) if (e.isIntersecting) setActive(e.target.id); },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => obs.observe(el));
    const onScroll = () => { if (window.scrollY < 300) setActive(null); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { obs.disconnect(); window.removeEventListener("scroll", onScroll); };
  }, [key]);
  return active;
}
