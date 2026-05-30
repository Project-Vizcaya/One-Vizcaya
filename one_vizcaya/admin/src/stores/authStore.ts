import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";
import type { AdminRole } from "@/lib/firebase";

interface AuthState {
  user: AuthUser | null;
  viewAs: "provincial" | "municipal";
  viewMunicipality: string | null;
  isLoading: boolean;
  sessionExpired: boolean;
  setUser: (user: AuthUser | null) => void;
  setViewAs: (view: "provincial" | "municipal", municipality?: string) => void;
  setLoading: (loading: boolean) => void;
  setSessionExpired: (expired: boolean) => void;
  clearAuth: () => void;
  getEffectiveMunicipality: () => string | null;
  canViewAll: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      viewAs: "provincial",
      viewMunicipality: null,
      isLoading: true,
      sessionExpired: false,

      setUser: (user) => {
        if (!user) {
          set({ user: null, viewAs: "provincial", viewMunicipality: null });
          return;
        }
        const isProvincial = (["admin", "provincial_admin", "super_admin"] as AdminRole[]).includes(user.role);
        set({
          user,
          viewAs: isProvincial ? "provincial" : "municipal",
          viewMunicipality: isProvincial ? null : (user.municipality ?? null),
        });
      },

      setViewAs: (view, municipality) => {
        set({
          viewAs: view,
          viewMunicipality: view === "municipal" ? (municipality ?? null) : null,
        });
      },

      setLoading: (loading) => set({ isLoading: loading }),
      setSessionExpired: (expired) => set({ sessionExpired: expired }),

      clearAuth: () =>
        set({ user: null, viewAs: "provincial", viewMunicipality: null, sessionExpired: false }),

      getEffectiveMunicipality: () => {
        const { viewAs, viewMunicipality } = get();
        return viewAs === "municipal" ? viewMunicipality : null;
      },

      canViewAll: () => {
        const { viewAs } = get();
        return viewAs === "provincial";
      },
    }),
    {
      name: "one-vizcaya-auth",
      partialize: (state) => ({
        viewAs: state.viewAs,
        viewMunicipality: state.viewMunicipality,
      }),
    }
  )
);
