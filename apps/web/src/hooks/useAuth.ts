import { useEffect, useRef } from "react";
import { onAuthStateChanged, signOut as firebaseSignOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, ADMIN_ROLES } from "@/lib/firebase";
import { useAuthStore } from "@/stores/authStore";
import type { AuthUser } from "@/types";

const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

export function useAuth() {
  const { user, isLoading, sessionExpired, setUser, setLoading, setSessionExpired, clearAuth } =
    useAuthStore();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setSessionExpired(true);
    }, SESSION_TIMEOUT);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
        if (!userDoc.exists()) {
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        const data = userDoc.data();
        const role = data.role as string;

        if (!ADMIN_ROLES.includes(role as never)) {
          await firebaseSignOut(auth);
          setUser(null);
          setLoading(false);
          return;
        }

        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          phoneNumber: firebaseUser.phoneNumber,
          name: data.name || "Admin",
          role: role as AuthUser["role"],
          municipality: data.municipality,
          barangay: data.barangay,
        };

        setUser(authUser);
        resetTimer();
      } catch (err) {
        console.error("Auth error:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    const events = ["mousedown", "keydown", "touchstart", "scroll"];
    const handleActivity = () => {
      if (user) resetTimer();
    };
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));

    return () => {
      unsubscribe();
      events.forEach((e) => window.removeEventListener(e, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const signOut = async () => {
    await firebaseSignOut(auth);
    clearAuth();
  };

  return { user, isLoading, sessionExpired, signOut };
}
