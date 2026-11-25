import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";

// The Firebase auth listener is NOT started here: it runs in the /login and
// /dashboard routes, so the public pages (/, /privacy) don't download Firebase.
function RootLayout() {
  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

export const Route = createRootRoute({
  component: RootLayout,
});
