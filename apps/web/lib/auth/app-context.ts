import { getSupabaseConfig } from "../supabase/config";
import { createServerSupabaseClient } from "../supabase/server";

export type AlphaAppContext =
  | { state: "unconfigured" }
  | { state: "unauthenticated" }
  | { state: "needs_organization"; userId: string; email: string | null }
  | {
      state: "ready";
      userId: string;
      email: string | null;
      displayName: string;
      membershipId: string;
      organizationId: string;
      organizationName: string;
      organizationSlug: string;
      roleId: string;
      roleKey: string;
      roleName: string;
      accessScope: "assigned" | "all";
      enabledModules: string[];
    };

function stringValue(value: unknown) {
  return typeof value === "string" ? value : null;
}

export async function getAlphaAppContext(): Promise<AlphaAppContext> {
  const config = getSupabaseConfig();

  if (!config.configured) {
    return { state: "unconfigured" };
  }

  const supabase = await createServerSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  if (!user) {
    return { state: "unauthenticated" };
  }

  const { data: membership } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, role_id, record_access_scope")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!membership) {
    return {
      state: "needs_organization",
      userId: user.id,
      email: user.email ?? null
    };
  }

  const [{ data: organization }, { data: role }, { data: entitlements }, { data: profile }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("id, name, slug")
        .eq("id", membership.organization_id)
        .single(),
      supabase
        .from("organization_roles")
        .select("id, role_key, name")
        .eq("id", membership.role_id)
        .single(),
      supabase
        .from("organization_module_entitlements")
        .select("module_key, enabled, starts_at, ends_at")
        .eq("organization_id", membership.organization_id)
        .eq("enabled", true),
      supabase
        .from("profiles")
        .select("full_name, display_name")
        .eq("user_id", user.id)
        .maybeSingle()
    ]);

  if (!organization || !role) {
    return {
      state: "needs_organization",
      userId: user.id,
      email: user.email ?? null
    };
  }

  const now = Date.now();
  const enabledModules =
    entitlements
      ?.filter((entitlement) => {
        const startsAt = stringValue(entitlement.starts_at);
        const endsAt = stringValue(entitlement.ends_at);
        return (!startsAt || Date.parse(startsAt) <= now) && (!endsAt || Date.parse(endsAt) >= now);
      })
      .map((entitlement) => entitlement.module_key) ?? [];

  const displayName =
    profile?.display_name ||
    profile?.full_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email ||
    "ScopeLogic User";

  return {
    state: "ready",
    userId: user.id,
    email: user.email ?? null,
    displayName,
    membershipId: membership.id,
    organizationId: organization.id,
    organizationName: organization.name,
    organizationSlug: organization.slug,
    roleId: role.id,
    roleKey: role.role_key,
    roleName: role.name,
    accessScope: membership.record_access_scope,
    enabledModules
  };
}
