import { NextResponse, type NextRequest } from "next/server";

/**
 * Demo-only route allowlist.
 * This does not replace authorization (the API, DB RLS and organization permissions
 * still enforce data security). It prevents unrelated Alpha modules appearing
 * via direct URLs while the Quote Builder demonstration is running.
 */
const exactRoutes = new Set([
  "/", "/login", "/onboarding",
  "/projects", "/projects/new",
  "/crm/customers", "/crm/customers/new",
  "/quotes", "/quotes/new",
  "/rules-engine", "/rules-engine/new",
  "/administration/catalog", "/administration/catalog/new",
  "/administration/labor", "/administration/suppliers",
  "/administration/assemblies", "/administration/proposals",
  "/api/health",
  "/api/v1/quotes", "/api/v1/rules",
  "/api/v1/customers", "/api/v1/projects",
  "/api/v1/catalog/items", "/api/v1/suppliers"
]);
const routePrefixes = [
  "/quotes/",
  "/projects/"
];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (exactRoutes.has(pathname) || routePrefixes.some(prefix => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }
  // Preserve framework assets; block unrequested app pages and API surfaces.
  if (pathname.startsWith("/_next/") || pathname.startsWith("/brand/") ||
      pathname === "/favicon.ico" ||
      /\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$/i.test(pathname)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Module unavailable in Quote Builder demo" }, { status: 404 });
  }
  return NextResponse.redirect(new URL("/", request.url));
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
