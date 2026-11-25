import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Download, Menu, Phone as PhoneIcon, X } from "lucide-react";
import { ProvinceMark } from "./MunicipalityMap";

// Facts shown on the public pages. The PDRRMO number is the one the app
// already dials for SOS and "Call first" (apps/mobile app_constants.dart).
export const PDRRMO_HOTLINE = "0917 122 7150";
export const PDRRMO_TEL = "tel:+639171227150";
export const APK_URL = "/downloads/One-Vizcaya.apk";
export const APK_AVAILABLE = __APK_AVAILABLE__;
export const APK_SIZE_MB = __APK_SIZE_MB__;

export function Wordmark({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span aria-hidden="true" className={`flex h-9 w-9 items-center justify-center rounded-md ${onDark ? "bg-white" : "bg-[var(--site-green)]"}`}>
        <ProvinceMark className={`h-7 w-7 ${onDark ? "text-[var(--site-green)]" : "text-white"}`} />
      </span>
      <span className={`text-[19px] font-extrabold leading-tight tracking-tight ${onDark ? "text-white" : "text-[var(--site-green)]"}`}>One Vizcaya</span>
    </span>
  );
}

export function SiteHeader({ nav = [], active }: { nav?: { label: string; href: string }[]; active?: string | null }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--site-line)] bg-white/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-4 py-2">
        <Link to="/" className="flex min-h-[48px] items-center rounded-md" aria-label="One Vizcaya home"><Wordmark /></Link>
        {nav.length > 0 && (
          <nav aria-label="Main" className="hidden self-stretch items-center gap-7 lg:flex">
            {nav.map((n) => {
              const on = active === n.href.slice(1);
              return (
                <a key={n.href} href={n.href} aria-current={on ? "true" : undefined}
                  className={`relative flex h-full items-center text-[15px] font-semibold transition-colors duration-150 ${on ? "text-[var(--site-green)]" : "text-[var(--site-muted)] hover:text-[var(--site-green)]"}`}>
                  {n.label}
                  {on && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[3px] rounded-t bg-[var(--site-gold)]" />}
                </a>
              );
            })}
          </nav>
        )}
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden px-2 text-[15px] font-semibold text-[var(--site-muted)] hover:text-[var(--site-green)] lg:inline">LGU sign-in</Link>
          <a href="/#download" className="btn-primary hidden sm:inline-flex"><Download className="h-4 w-4" aria-hidden="true" /> Get the app</a>
          <a href="tel:911" className="btn-emergency"><PhoneIcon className="h-4 w-4" aria-hidden="true" /> Call 911</a>
          {nav.length > 0 && (
            <button type="button" className="flex h-12 w-12 min-h-[48px] min-w-[48px] items-center justify-center rounded-md lg:hidden"
              aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((v) => !v)}>
              {open ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
      {open && nav.length > 0 && (
        <nav id="mobile-nav" aria-label="Main" className="border-t border-[var(--site-line)] bg-white px-4 py-2 lg:hidden">
          <ul className="flex flex-col">
            {nav.map((n) => (
              <li key={n.href}>
                <a href={n.href} onClick={() => setOpen(false)} className="flex min-h-[48px] items-center rounded-md px-2 text-base font-semibold text-[var(--site-ink)] hover:bg-[var(--site-paper)]">{n.label}</a>
              </li>
            ))}
            <li><Link to="/login" className="flex min-h-[48px] items-center rounded-md px-2 text-base font-semibold text-[var(--site-muted)]">LGU staff sign-in</Link></li>
            <li className="py-2 sm:hidden">
              <a href="/#download" onClick={() => setOpen(false)} className="btn-primary btn-lg w-full"><Download className="h-5 w-5" aria-hidden="true" /> Get the app</a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--site-line)] bg-[var(--site-paper)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-[1.2fr_1fr_1fr]">
        <div>
          <Wordmark />
          <p className="mt-3 max-w-xs text-[15px] text-[var(--site-muted)]">
            Civic and hazard reporting for Nueva Vizcaya, from the barangay to the Provincial Capitol.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--site-muted)]">Emergency hotlines</h2>
          <ul className="mt-2 text-[15px]">
            <li><a href="tel:911" className="inline-flex min-h-[44px] items-center font-bold text-red-700 underline-offset-4 hover:underline">911 · National emergency</a></li>
            <li><a href={PDRRMO_TEL} className="inline-flex min-h-[44px] items-center font-bold text-red-700 underline-offset-4 hover:underline">{PDRRMO_HOTLINE} · PDRRMO Nueva Vizcaya</a></li>
          </ul>
          <p lang="fil" className="mt-3 text-sm text-[var(--site-muted)]">
            Hindi kapalit ang One Vizcaya ng 911, ng PDRRMO hotline, ng radyo, o ng mga opisyal ng barangay.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--site-muted)]">About</h2>
          <ul className="mt-2 text-[15px]">
            <li><Link to="/privacy" className="inline-flex min-h-[44px] items-center text-[var(--site-ink)] underline-offset-4 hover:text-[var(--site-green)] hover:underline">Data Privacy Notice</Link></li>
            <li><Link to="/login" className="inline-flex min-h-[44px] items-center text-[var(--site-ink)] underline-offset-4 hover:text-[var(--site-green)] hover:underline">LGU staff sign-in</Link></li>
          </ul>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4">
        <div className="border-t border-[var(--site-line)] py-6 text-sm text-[var(--site-muted)]">
          <p>Developed by Aaron Anthony A. Gano II, Sean Godric Reyes and Darius Acosta (Project: Vizcaya Team).</p>
          <p className="mt-1">© 2026 One Vizcaya · Made for the people of Nueva Vizcaya.</p>
        </div>
      </div>
    </footer>
  );
}
