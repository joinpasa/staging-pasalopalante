import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { clearStoredReferral, getStoredReferral } from "@/lib/referral";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string, displayName?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Same-visit referral attribution: once a session exists, attach the stored
  // invite code to this (new) account. The DB ignores it for older accounts.
  const claimedRef = useRef(false);
  useEffect(() => {
    if (!user || claimedRef.current) return;
    const code = getStoredReferral();
    if (!code) return;
    claimedRef.current = true;
    (async () => {
      try {
        await supabase.rpc("claim_referral", { _code: code });
      } catch (e) {
        console.error("claim_referral failed", e);
      } finally {
        clearStoredReferral();
      }
    })();
  }, [user]);



  // Use the published canonical origin for emailed links so users aren't sent
  // back to ephemeral preview URLs after clicking a magic link / reset link.
  const getCanonicalOrigin = () => {
    const o = window.location.origin;
    const isPreview =
      o.includes("id-preview--") ||
      o.includes("lovableproject.com") ||
      o.includes("lovable.app") === false; // localhost / unknown
    if (isPreview && !o.startsWith("http://localhost")) {
      return "https://kindnessworldwide.lovable.app";
    }
    // For localhost dev, still use the published origin so emailed links work.
    if (o.startsWith("http://localhost")) {
      return "https://kindnessworldwide.lovable.app";
    }
    return o;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getCanonicalOrigin()}/account`,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithMagicLink = async (email: string, displayName?: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getCanonicalOrigin()}/account`,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    return { error };
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${getCanonicalOrigin()}/reset-password`,
    });
    return { error };
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signInWithMagicLink, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
