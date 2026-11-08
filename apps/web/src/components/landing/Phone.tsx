import type { ReactNode } from "react";
import { Camera, MapPin, ChevronRight, Bell, Phone as PhoneIcon, CloudRain, Check } from "lucide-react";
import { MunicipalityMap } from "./MunicipalityMap";

// Phone mockups drawn in HTML/CSS (no stock photos). Content mirrors the real
// app: report categories from apps/mobile/lib/domain/enums/report_category.dart,
// statuses from report_status_card.dart.

export function Phone({ label, children }: { label: string; children: ReactNode }) {
  return (
    <figure
      role="img"
      aria-label={label}
      className="mx-auto w-[260px] shrink-0 rounded-[2.4rem] border-[10px] border-slate-900 bg-slate-900 shadow-2xl"
    >
      <div className="relative h-[500px] overflow-hidden rounded-[1.7rem] bg-white" aria-hidden="true">
        <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-slate-900" />
        <div className="flex h-9 items-end justify-between px-5 pb-1 text-[10px] font-semibold text-slate-700">
          <span>9:41</span>
          <span>LTE</span>
        </div>
        {children}
      </div>
    </figure>
  );
}

function AppBar({ title }: { title: string }) {
  return (
    <div className="bg-[#166534] px-4 py-3 text-white">
      <p className="text-[11px] opacity-80">One Vizcaya</p>
      <p className="text-sm font-bold">{title}</p>
    </div>
  );
}

export function ReportScreen() {
  return (
    <>
      <AppBar title="Report a problem" />
      <div className="space-y-3 p-4 text-[12px] text-slate-800">
        <div>
          <p className="mb-1 font-semibold">Category</p>
          <div className="flex items-center justify-between rounded-xl border px-3 py-2">
            <span>Flooding / Severe Drainage Issue</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          </div>
        </div>
        <div>
          <p className="mb-1 font-semibold">Photo</p>
          <div className="flex h-16 items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-500">
            <Camera className="h-4 w-4" /> Live camera capture
          </div>
        </div>
        <div>
          <p className="mb-1 font-semibold">Location</p>
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <MapPin className="h-3.5 w-3.5 text-[#166534]" />
            <span>Brgy. Don Domingo Maddela, Bayombong</span>
          </div>
          <p className="mt-1 text-[10px] text-slate-500">GPS 16.4823, 121.1489 · ±8 m</p>
        </div>
        <div>
          <p className="mb-1 font-semibold">Description</p>
          <div className="rounded-xl border px-3 py-2 text-slate-500">Canal overflowing onto the road…</div>
        </div>
        <div className="rounded-xl bg-[#166534] py-2.5 text-center font-semibold text-white">Submit report</div>
      </div>
    </>
  );
}

export function MapScreen() {
  return (
    <>
      <AppBar title="Live map" />
      <div className="p-3">
        <div className="flex gap-1.5 text-[10px] font-semibold">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900">Under review</span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-sky-900">In progress</span>
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-900">Resolved</span>
        </div>
        <div className="relative mt-2 rounded-xl bg-[#f0fdf4] p-2">
          <MunicipalityMap className="h-[300px] w-full" />
          {[
            ["38%", "45%", "bg-amber-500"],
            ["52%", "30%", "bg-sky-600"],
            ["30%", "62%", "bg-green-600"],
            ["60%", "55%", "bg-amber-500"],
            ["45%", "75%", "bg-green-600"],
          ].map(([l, t, c], i) => (
            <span key={i} className={`absolute h-3 w-3 rounded-full border-2 border-white ${c}`} style={{ left: l, top: t }} />
          ))}
        </div>
        <div className="mt-2 rounded-xl border p-2 text-[11px]">
          <p className="font-semibold">Bayombong</p>
          <p className="text-slate-500">4 under review · 2 in progress · 11 resolved</p>
        </div>
      </div>
    </>
  );
}

export function AlertsScreen() {
  const items = [
    { icon: CloudRain, t: "Heavy rainfall advisory", s: "Provincial advisory · Kasibu, Quezon, Dupax del Norte", tone: "bg-amber-50 border-amber-200" },
    { icon: Bell, t: "Road closure advisory", s: "Provincial advisory · 2 h ago", tone: "bg-slate-50" },
    { icon: Check, t: "Your report is In Progress", s: "Municipal Engineering · Bayombong", tone: "bg-green-50 border-green-200" },
  ];
  return (
    <>
      <AppBar title="Alerts" />
      <div className="space-y-2.5 p-3 text-[11px]">
        {items.map((it) => (
          <div key={it.t} className={`flex gap-2.5 rounded-xl border p-3 ${it.tone}`}>
            <it.icon className="mt-0.5 h-4 w-4 shrink-0 text-[#166534]" />
            <div>
              <p className="font-semibold text-slate-900">{it.t}</p>
              <p className="text-slate-600">{it.s}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export function SosScreen() {
  return (
    <>
      <AppBar title="Emergency" />
      <div className="flex flex-col items-center p-5 text-center text-[12px]">
        <div className="mt-6 flex h-36 w-36 items-center justify-center rounded-full bg-red-700 text-white shadow-lg ring-8 ring-red-100">
          <div>
            <PhoneIcon className="mx-auto h-8 w-8" />
            <p className="mt-1 text-base font-extrabold">PDRRMO</p>
          </div>
        </div>
        <p className="mt-5 font-semibold text-slate-900">One tap to reach the Provincial Disaster office</p>
        <p className="mt-1 text-slate-500">Your GPS location is shared with the responder.</p>
        <div className="mt-6 w-full space-y-2 text-left">
          <div className="rounded-xl border px-3 py-2">BFP · your municipality</div>
          <div className="rounded-xl border px-3 py-2">Municipal DRRMO</div>
        </div>
      </div>
    </>
  );
}
