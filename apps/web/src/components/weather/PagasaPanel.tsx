import { BadgeCheck, CloudOff, History, Loader2, AlertTriangle, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePagasaProduct } from "@/hooks/usePagasaProduct";
import {
  fmtPht, isExpired, pagasaFreshness,
  type PagasaCoverage, type PagasaPeriod, type PagasaProduct, type PagasaThunderstorm,
} from "@/lib/pagasa";

// OFFICIAL PAGASA WEATHER — NUEVA VIZCAYA (web console).
// Reads the same Firestore document as the mobile app and applies the same
// rules: provincial coverage is never presented as a town reading; advisory
// text is verbatim; an item is current only within PAGASA's stated window;
// nothing here raises an alert.

const KIND_LABEL: Record<string, string> = {
  advisory: "Thunderstorm Advisory",
  watch: "Thunderstorm Watch",
  information: "Thunderstorm Information",
};

export function PagasaPanel({ place }: { place: string }) {
  const { product: p, loading } = usePagasaProduct();
  const now = new Date();
  const freshness = pagasaFreshness(p, now);

  const header = (
    <CardHeader className="pb-2">
      <CardTitle className="text-sm flex items-center gap-1.5">
        <BadgeCheck className="h-4 w-4 text-[hsl(var(--gov-green-700))]" />
        Official PAGASA Weather — Nueva Vizcaya
      </CardTitle>
    </CardHeader>
  );

  if (loading) {
    return (
      <Card>{header}
        <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading the official PAGASA forecast…
        </CardContent>
      </Card>
    );
  }
  if (freshness === "unavailable" || !p) {
    return (
      <Card>{header}
        <CardContent className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400">
          <CloudOff className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>
            Official PAGASA data is temporarily unavailable.
            {p?.lastErrorAt ? ` Last attempt ${fmtPht(p.lastErrorAt)}.` : ""}
          </span>
        </CardContent>
      </Card>
    );
  }

  const last = p.lastSuccessAt ?? p.retrievedAt;
  const current = p.thunderstorms?.items.filter((t) => !isExpired(t, now)) ?? [];
  const expired = p.thunderstorms?.items.filter((t) => isExpired(t, now)) ?? [];
  const fcExpired = !!p.forecast?.validUntil && now > p.forecast.validUntil;
  const synExpired = !!p.synopsis?.validUntil && now > p.synopsis.validUntil;
  const outlookOld = !!p.outlook?.issuedAt && now.getTime() - p.outlook.issuedAt.getTime() > 36 * 3600e3;

  return (
    <Card className="border-[hsl(var(--gov-green-700))]/40">
      {header}
      <CardContent className="space-y-4">
        <Freshness p={p} freshness={freshness} last={last} />
        <p className="text-xs text-muted-foreground">
          Provincial forecast covering Nueva Vizcaya.
          {place !== "Province-wide" && ` It is not a reading from a weather station in ${place}.`}
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* 24-hour provincial forecast */}
          <section className="rounded-lg border p-3 space-y-2">
            <h3 className="text-xs font-semibold">24-hour provincial forecast</h3>
            {fcExpired && <Note icon={Clock}>This forecast expired {fmtPht(p.forecast!.validUntil)}. A newer one has not been retrieved.</Note>}
            {p.forecast?.day && <Period label="Day" x={p.forecast.day} />}
            {p.forecast?.night && <Period label="Night" x={p.forecast.night} />}
            <Meta p={p} coverage={p.forecast?.coverage} issued={p.forecast?.issuedAt} validUntil={p.forecast?.validUntil} />
          </section>

          {/* 5-day provincial outlook */}
          {p.outlook && p.outlook.days.length > 0 && (
            <section className="rounded-lg border p-3 space-y-2">
              <h3 className="text-xs font-semibold">5-day outlook — Nueva Vizcaya</h3>
              {outlookOld && <Note icon={Clock}>Issued {fmtPht(p.outlook.issuedAt)} — may be outdated.</Note>}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                {p.outlook.days.map((d, i) => (
                  <div key={i} className="rounded-md bg-muted/40 p-2 text-xs space-y-0.5">
                    <p className="font-semibold">{d.label}{d.date ? ` · ${d.date.slice(5)}` : ""}</p>
                    {d.description && <p className="text-muted-foreground leading-snug">{d.description}</p>}
                    {(d.low !== null || d.high !== null) && (
                      <p>{d.low !== null && `${Math.round(d.low)}°`}{d.low !== null && d.high !== null && " – "}{d.high !== null && `${Math.round(d.high)}°C`}</p>
                    )}
                    {(d.windSpeed || d.windDirection) && (
                      <p className="text-muted-foreground">{[d.windSpeed, d.windDirection].filter(Boolean).join(", ")}</p>
                    )}
                  </div>
                ))}
              </div>
              <Meta p={p} coverage={p.forecast?.coverage} issued={p.outlook.issuedAt} />
            </section>
          )}

          {/* Rainfall + thunderstorms */}
          <section className="rounded-lg border p-3 space-y-2">
            <h3 className="text-xs font-semibold">Heavy rainfall warning</h3>
            {p.rainfall?.noneIssued === true ? (
              <p className="text-xs">No heavy rainfall warning issued by PAGASA.</p>
            ) : p.rainfall?.text ? (
              <Verbatim label="As published by PAGASA:" text={p.rainfall.text} />
            ) : (
              <p className="text-xs text-muted-foreground">Rainfall warning status was not found on the PAGASA page.</p>
            )}
            <Meta p={p} coverage={p.rainfall?.coverage} />

            <h3 className="text-xs font-semibold pt-2">Thunderstorm information and watch</h3>
            {current.length === 0 && <p className="text-xs">No current thunderstorm information published.</p>}
            {current.map((t, i) => <Thunderstorm key={`c${i}`} t={t} expired={false} />)}
            {expired.length > 0 && (
              <>
                <p className="text-[11px] font-semibold text-muted-foreground pt-1">Expired</p>
                {expired.map((t, i) => <Thunderstorm key={`e${i}`} t={t} expired />)}
              </>
            )}
            <Meta p={p} coverage={p.thunderstorms?.coverage} />
          </section>

          {/* Regional synopsis / tropical cyclone information */}
          {p.synopsis?.text && (
            <section className="rounded-lg border p-3 space-y-2">
              <h3 className="text-xs font-semibold">
                {p.synopsis.mentionsTropicalCyclone ? "Synopsis & tropical cyclone information" : "Regional synopsis"}
              </h3>
              {synExpired && <Note icon={Clock}>This synopsis expired {fmtPht(p.synopsis.validUntil)}.</Note>}
              <p className="text-xs whitespace-pre-line leading-relaxed">{p.synopsis.text}</p>
              {p.synopsis.mentionsTropicalCyclone && (
                <p className="text-[11px] text-muted-foreground">
                  Shown as published. For official tropical cyclone warnings and wind signals, follow PAGASA bulletins and PDRRMO.
                </p>
              )}
              <Meta p={p} coverage={p.synopsis.coverage} issued={p.synopsis.issuedAt} validUntil={p.synopsis.validUntil} />
            </section>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Freshness({ p, freshness, last }: { p: PagasaProduct; freshness: string; last: Date | null }) {
  if (freshness === "updated")
    return <Note icon={BadgeCheck} tone="ok">Updated from PAGASA {fmtPht(last)}.</Note>;
  if (freshness === "cached")
    return (
      <Note icon={History}>
        Showing the last PAGASA data retrieved {fmtPht(last)}.{" "}
        {p.lastErrorAt && last && p.lastErrorAt > last ? "The latest update attempt failed." : "A newer update has not arrived yet."}
      </Note>
    );
  return (
    <Note icon={AlertTriangle} tone="bad">
      Stale: this PAGASA data was last retrieved {fmtPht(last)}. Check pagasa.dost.gov.ph for the current forecast.
    </Note>
  );
}

function Period({ label, x }: { label: string; x: PagasaPeriod }) {
  const temps = [x.low !== null && `Low ${Math.round(x.low)}°C`, x.high !== null && `High ${Math.round(x.high)}°C`].filter(Boolean).join(" · ");
  const wind = [x.windSpeed, x.windDirection].filter(Boolean).join(", ");
  return (
    <div className="text-xs space-y-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      {x.description && <p className="text-sm">{x.description}</p>}
      {temps && <p>{temps}</p>}
      {wind && <p className="text-muted-foreground">Wind: {wind}</p>}
    </div>
  );
}

function Thunderstorm({ t, expired }: { t: PagasaThunderstorm; expired: boolean }) {
  return (
    <div className={`rounded-md border p-2 space-y-1 ${expired ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap gap-1">
        <Badge variant="secondary" className="text-[10px]">{KIND_LABEL[t.kind] ?? "PAGASA thunderstorm item"}</Badge>
        <Badge variant="outline" className="text-[10px]">
          {t.mentionsNuevaVizcaya ? "Names Nueva Vizcaya" : "Does not name Nueva Vizcaya"}
        </Badge>
      </div>
      <p className="text-xs whitespace-pre-line leading-relaxed">{t.text}</p>
      <p className="text-[11px] text-muted-foreground">
        {t.validUntil ? `${expired ? "Expired" : "Valid until"} ${fmtPht(t.validUntil)}` : "Validity not stated by PAGASA"}
      </p>
    </div>
  );
}

function Meta({ p, coverage, issued, validUntil }: {
  p: PagasaProduct; coverage?: PagasaCoverage | null; issued?: Date | null; validUntil?: Date | null;
}) {
  const parts = [
    `Source: ${p.office}`,
    coverage && `Coverage: ${coverage.level === "province" ? "Province" : "Region"}: ${coverage.name}`,
    issued && `Issued ${fmtPht(issued)}`,
    validUntil && `Valid until ${fmtPht(validUntil)}`,
    `Retrieved ${fmtPht(p.lastSuccessAt ?? p.retrievedAt)}`,
  ].filter(Boolean);
  return (
    <div className="text-[10.5px] text-muted-foreground space-y-0.5">
      <p>{parts.join(" · ")}</p>
      <a href={p.sourceUrl} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-[hsl(var(--gov-green-700))] hover:underline">
        View original on PAGASA <ExternalLink className="h-3 w-3" />
      </a>
    </div>
  );
}

function Note({ icon: Icon, tone, children }: {
  icon: React.ComponentType<{ className?: string }>; tone?: "ok" | "bad"; children: React.ReactNode;
}) {
  const color = tone === "ok" ? "text-emerald-700 dark:text-emerald-400"
    : tone === "bad" ? "text-red-700 dark:text-red-400" : "text-amber-700 dark:text-amber-400";
  return (
    <p className={`flex items-start gap-1.5 text-xs ${color}`}>
      <Icon className="h-3.5 w-3.5 mt-0.5 shrink-0" /><span>{children}</span>
    </p>
  );
}

function Verbatim({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-amber-400/50 bg-amber-50/50 dark:bg-amber-950/20 p-2">
      <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-300">{label}</p>
      <p className="text-xs whitespace-pre-line">{text}</p>
    </div>
  );
}
