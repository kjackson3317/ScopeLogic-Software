"use client";

import { FormEvent, useMemo, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import { getSupabaseConfig } from "../../lib/supabase/config";

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function OnboardingPage() {
  const config = useMemo(() => getSupabaseConfig(), []);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateName(nextName: string) {
    setName(nextName);
    if (!slugTouched) {
      setSlug(slugify(nextName));
    }
  }

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
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        window.location.href = "/login";
        return;
      }

      const { error } = await supabase.rpc("create_organization_for_current_user", {
        organization_name: name,
        organization_slug: slug
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.href = "/";
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to create company.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-card">
        <div className="brand login-brand">
          <div className="brand-mark">S</div>
          <div>
            <strong>ScopeLogic</strong>
            <span>Software Alpha</span>
          </div>
        </div>

        <div className="login-copy">
          <p className="section-kicker">Company setup</p>
          <h1>Create your Alpha workspace</h1>
          <p>
            This creates the organization tenant, default roles, permissions, and Alpha module entitlements.
          </p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Company name
            <input
              value={name}
              onChange={(event) => updateName(event.target.value)}
              placeholder="Example Construction, Inc."
              required
            />
          </label>

          <label>
            Workspace slug
            <input
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="example-construction"
              required
            />
          </label>

          {message ? <div className="form-message">{message}</div> : null}

          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Creating workspace..." : "Create workspace"}
          </button>
        </form>
      </section>
    </main>
  );
}
