"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { getSupabaseConfig } from "../../lib/supabase/config";

export default function LoginPage() {
  const config = useMemo(() => getSupabaseConfig(), []);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!config.configured) {
      setMessage("Alpha Supabase is not configured yet.");
      return;
    }

    setBusy(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <img
            className="brand-logo"
            src="/brand/scopelogic-software-4c-mark.svg"
            alt="ScopeLogic Software"
          />
          <div>
            <strong>ScopeLogic</strong>
            <span>Software · Alpha</span>
          </div>
        </div>

        <div className="login-copy">
          <p className="section-kicker">Alpha environment</p>
          <h1>Sign in</h1>
          <p>
            This login is for the isolated commercial-software Alpha. It is not connected to the existing ScopeLogic production application.
          </p>
        </div>

        {!config.configured ? (
          <div className="config-warning">
            <strong>Database not connected yet</strong>
            <p>Add the new Alpha Supabase URL and anonymous key after the isolated project is created.</p>
          </div>
        ) : null}

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              autoComplete="current-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>

          {message ? <div className="form-message">{message}</div> : null}

          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
