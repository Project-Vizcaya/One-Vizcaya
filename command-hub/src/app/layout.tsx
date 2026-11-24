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
      <body>
        <div role="note" className="bg-amber-400 text-amber-950 text-xs font-semibold text-center px-3 py-1">
          PROTOTYPE · mock data only · demo sign-in · not for real emergencies
        </div>
        {children}
      </body>
    </html>
  );
}
