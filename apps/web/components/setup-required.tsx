export function SetupRequired() {
  return (
    <main className="setup-page">
      <section className="setup-card">
        <img
          className="brand-logo setup-logo"
          src="/brand/scopelogic-software-4c-mark.svg"
          alt="ScopeLogic Software"
        />
        <p className="section-kicker">ScopeLogic Software Alpha</p>
        <h1>Alpha database setup required</h1>
        <p>
          The web shell is installed, but this environment is not connected to the new isolated ScopeLogic Software Alpha Supabase project yet.
        </p>
        <div className="setup-code">
          NEXT_PUBLIC_SUPABASE_URL<br />
          NEXT_PUBLIC_SUPABASE_ANON_KEY
        </div>
        <p className="setup-note">
          Do not use the credentials from the existing production ScopeLogic application.
        </p>
      </section>
    </main>
  );
}
