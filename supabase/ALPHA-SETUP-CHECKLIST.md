# Alpha Supabase Setup Checklist

Use this only when creating the new isolated ScopeLogic Software Alpha Supabase project.

- [ ] New Supabase project is NOT the existing ScopeLogic production project.
- [ ] Record the new project URL.
- [ ] Record the new anonymous/publishable client key.
- [ ] Apply `0001_alpha_foundation.sql`.
- [ ] Create one Alpha test user in Supabase Auth.
- [ ] Sign in at `/login`.
- [ ] Call `create_organization_for_current_user()` during onboarding (Batch 3 will add the UI).
- [ ] Verify the new organization seeded seven default roles.
- [ ] Verify `core`, `quote`, and `rules` are enabled.
- [ ] Verify other premium modules are disabled initially.
- [ ] Do not add real production/customer data to Alpha yet.
