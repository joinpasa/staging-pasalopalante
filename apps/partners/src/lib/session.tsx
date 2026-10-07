import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { callFunction, portal } from "./portalClient";

export interface Partner {
  id: string;
  name: string;
  city: string | null;
}

export interface Staff {
  id: string;
  name: string;
}

interface AuthResponse {
  token_hash: string;
  partner: Partner;
  staff: Staff;
  staff_code?: string;
}

type Status = "loading" | "out" | "in";

interface SessionCtx {
  status: Status;
  session: Session | null;
  partner: Partner | null;
  staff: Staff | null;
  login: (partnerId: string, staffCode: string) => Promise<void>;
  /** Creates a Staff ID from an invite link; resolves to the new plain ID. */
  join: (inviteToken: string, name: string) => Promise<string>;
  logout: () => Promise<void>;
}

// Who's using the school's shared account on this device. The school's
// Supabase session is one account for everyone; this is the per-person part.
const STAFF_KEY = "ppl-partner-staff";

interface Stored {
  partner: Partner;
  staff: Staff;
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STAFF_KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

function writeStored(value: Stored | null) {
  try {
    if (value) localStorage.setItem(STAFF_KEY, JSON.stringify(value));
    else localStorage.removeItem(STAFF_KEY);
  } catch {
    /* non-fatal */
  }
}

const Ctx = createContext<SessionCtx | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [session, setSession] = useState<Session | null>(null);
  const [who, setWho] = useState<Stored | null>(null);

  useEffect(() => {
    let cancelled = false;
    portal.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const stored = readStored();
      if (data.session && stored) {
        setSession(data.session);
        setWho(stored);
        setStatus("in");
      } else {
        // A session without a known staff member (or vice versa) is
        // half-finished — start clean rather than guess who this is.
        if (data.session) await portal.auth.signOut();
        writeStored(null);
        setStatus("out");
      }
    });
    const { data: sub } = portal.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_OUT") {
        setSession(null);
        setWho(null);
        setStatus("out");
      } else if (s) {
        setSession(s);
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const finish = useCallback(async (res: AuthResponse) => {
    const { data, error } = await portal.auth.verifyOtp({ token_hash: res.token_hash, type: "magiclink" });
    if (error || !data.session) throw new Error("Couldn't start your session. Please try again.");
    const stored = { partner: res.partner, staff: res.staff };
    writeStored(stored);
    setSession(data.session);
    setWho(stored);
    setStatus("in");
  }, []);

  const login = useCallback(
    async (partnerId: string, staffCode: string) => {
      const res = await callFunction<AuthResponse>("partner-auth", {
        action: "login",
        partner_id: partnerId,
        staff_code: staffCode,
      });
      await finish(res);
    },
    [finish],
  );

  const join = useCallback(
    async (inviteToken: string, name: string) => {
      const res = await callFunction<AuthResponse>("partner-auth", {
        action: "join",
        invite_token: inviteToken,
        name,
      });
      await finish(res);
      return res.staff_code ?? "";
    },
    [finish],
  );

  const logout = useCallback(async () => {
    writeStored(null);
    await portal.auth.signOut();
    setStatus("out");
  }, []);

  return (
    <Ctx.Provider
      value={{ status, session, partner: who?.partner ?? null, staff: who?.staff ?? null, login, join, logout }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useSession() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSession must be used within SessionProvider");
  return ctx;
}

/** Display form of a Staff ID: 7KQM4RTX -> 7KQM-4RTX. */
export function formatStaffCode(code: string) {
  const clean = code.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  return clean.length === 8 ? `${clean.slice(0, 4)}-${clean.slice(4)}` : clean;
}
