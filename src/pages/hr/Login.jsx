import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../../lib/AuthContext";
import characterImage from "./hiremotion-characterr.jpeg";

export default function Login() {
  const { user, profile, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) return <div className="min-h-screen bg-navy-0" />;
  if (user && profile) return <Navigate to={location.state?.from?.pathname || "/hr/postings"} replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!supabase) {
      setError("Authentication is not configured. Add the Supabase variables to .env.local.");
      return;
    }

    setSubmitting(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    navigate(location.state?.from?.pathname || "/hr/postings", { replace: true });
  }

  return (
    <main className="login-shell">
      <div className="login-scene" aria-hidden="true">
        <img className="hiremotion-image" src={characterImage} alt="" />
      </div>

      <div className="login-layout">
        <div className="login-copy">
          <p className="login-kicker">HireMotion</p>
          <h2>Smart hiring for teams that move fast.</h2>
        </div>

        <form onSubmit={handleSubmit} className="login-card panel mb-0">
        <Link to="/" className="text-[1.05rem] font-semibold tracking-tight">
          Hire<span className="text-teal">Motion</span>
        </Link>
        <p className="mt-10 text-sm uppercase tracking-[0.18em] text-teal">HR workspace</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-ink-2">Use your HR account to manage hiring activity.</p>
        <label className="block mt-8 text-sm text-ink-1">
          Email
          <input className="field-input mt-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
        </label>
        <label className="block mt-4 text-sm text-ink-1">
          Password
          <input className="field-input mt-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
        </label>
          {error && <p className="mt-4 text-sm text-bad">{error}</p>}
          <button className="mt-6 w-full rounded-lg bg-teal px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60" type="submit" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}