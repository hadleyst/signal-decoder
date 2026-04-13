"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Session } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

interface AuthContextType {
  session: Session | null;
  isSubscribed: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  isSubscribed: false,
  loading: true,
  signOut: async () => {},
  refreshSubscription: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async (accessToken: string) => {
    try {
      const res = await fetch("/api/subscription", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setIsSubscribed(data.isSubscribed);
      }
    } catch {
      // Subscription check failed, default to not subscribed
    }
  }, []);

  const refreshSubscription = useCallback(async () => {
    if (session?.access_token) {
      await fetchSubscription(session.access_token);
    }
  }, [session, fetchSubscription]);

  useEffect(() => {
    getSupabase().auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchSubscription(session.access_token);
      }
      setLoading(false);
    });

    const { data: { subscription } } = getSupabase().auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchSubscription(session.access_token);
      } else {
        setIsSubscribed(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchSubscription]);

  const signOut = async () => {
    await getSupabase().auth.signOut();
    setSession(null);
    setIsSubscribed(false);
  };

  return (
    <AuthContext.Provider value={{ session, isSubscribed, loading, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}
