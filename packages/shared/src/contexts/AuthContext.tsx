import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@shared/integrations/supabase/client";
import { clearStoredReferral, getStoredReferral } from "@shared/lib/referral";
import { getCanonicalOrigin } from "@shared/lib/canonicalOrigin";
import { syncGhlTag } from "@shared/lib/ghlSync";

const GHL_EMAIL_VERIFIED_SYNCED_KEY = "ppl_ghl_email_verified_synced";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  signInWithMagicLink: (email: string, displayName?: string, redirectPath?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  /** Which platform this provider is mounted in — used only to label the
   *  contact's source correctly on GHL lifecycle syncs (email-verified)
   *  that fire from this shared context regardless of platform. Defaults
   *  to "website" since AuthProvider predates this prop and most existing
   *  mounts are on the website. */
  ghlSource?: "PPL Website" | "PPL App";
}

export const AuthProvider = ({ children, ghlSource = "PPL Website" }: AuthProviderProps) => {
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

  // Auth emails point their button at this app's own domain (see
  // auth-email-hook/index.ts) instead of straight at Supabase's raw
  // /auth/v1/verify endpoint. That endpoint verifies — and permanently
  // consumes — the token on a plain GET, which email security scanners
  // (Gmail, Outlook, corporate gateways) routinely prefetch to check a
  // link is safe, silently burning it before the person ever opens the
  // email. A scanner's plain HTTP fetch never runs this page's JS, so it
  // can't reach this call — only an actual visit can, which is exactly
  // what "the code says expired the instant I used it" was.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get("confirm_token_hash");
    const type = params.get("confirm_type");
    if (!tokenHash || !type) return;

    // Strip immediately so a reload or back-navigation can't retry an
    // already-consumed token and show a confusing second error.
    params.delete("confirm_token_hash");
    params.delete("confirm_type");
    const query = params.toString();
    window.history.replaceState(
      {},
      "",
      `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`,
    );

    supabase.auth.verifyOtp({ token_hash: tokenHash, type });
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

  // Tag the contact in GHL the first time a verified session shows up on this
  // browser (reaching a session at all means the magic link was clicked).
  // Gated by localStorage, not a ref, so it only fires once ever per browser
  // rather than once per mount.
  useEffect(() => {
    if (!user?.email) return;
    if (localStorage.getItem(GHL_EMAIL_VERIFIED_SYNCED_KEY)) return;
    localStorage.setItem(GHL_EMAIL_VERIFIED_SYNCED_KEY, "1");
    syncGhlTag(user.email, "email-verified", undefined, ghlSource);
  }, [user, ghlSource]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, displayName?: string, redirectPath = "/account") => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${getCanonicalOrigin()}${redirectPath}`,
        data: displayName ? { display_name: displayName } : undefined,
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const signInWithMagicLink = async (email: string, displayName?: string, redirectPath = "/account") => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${getCanonicalOrigin()}${redirectPath}`,
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
