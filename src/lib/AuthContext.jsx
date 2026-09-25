import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let mounted = true;
    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();
      if (mounted) {
        setSession(data.session);
        if (!error && data.session?.user) {
          const { data: nextProfile } = await supabase.from("profiles").select("id, company_id, role, full_name").eq("id", data.session.user.id).maybeSingle();
          if (mounted) setProfile(nextProfile);
        }
        setLoading(false);
      }
    }
    loadSession();

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      if (nextSession?.user) {
        const { data: nextProfile } = await supabase.from("profiles").select("id, company_id, role, full_name").eq("id", nextSession.user.id).maybeSingle();
        setProfile(nextProfile);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}