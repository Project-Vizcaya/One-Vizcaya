import { createRootRoute, Outlet } from "@tanstack/react-router";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";

function RootLayout() {
  useAuth(); // global auth listener — must run on every page
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
