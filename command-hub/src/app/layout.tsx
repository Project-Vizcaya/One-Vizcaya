import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PDRRMO Command Hub",
  description: "Prototype: live responder map, incidents, dispatch and hotline call log for Nueva Vizcaya. Mock data only.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Mono:wght@500;700&family=Atkinson+Hyperlegible+Next:wght@400..800&display=swap" />
      </head>
      <body>
        <div role="note" className="bg-gold text-[#2b1d00] text-xs font-bold text-center px-3 py-1 tracking-wide">
          Prototype · mock data · demo sign-in · not for real emergencies
        </div>
        {children}
      </body>
    </html>
  );
}
