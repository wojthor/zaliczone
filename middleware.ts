import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/ustaw-haslo",
  "/auth/callback",
  "/polityka-prywatnosci",
  "/regulamin",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { supabase, user, supabaseResponse } = await updateSession(request);

  const isPublic = PUBLIC_PATHS.some(
    (path) => pathname === path || (path !== "/" && pathname.startsWith(`${path}/`)),
  );

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/panel";
    return NextResponse.redirect(url);
  }

  // Zalogowany ADMIN na /panel nie może wejść na panel korepetytora
  if (user && supabase && (pathname === "/panel" || pathname === "/")) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role === "ADMIN" && pathname === "/panel") {
        const url = request.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
      }
    } catch {
      // ignore
    }
  }

  if (user && supabase && pathname.startsWith("/admin")) {
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.role !== "ADMIN") {
        const url = request.nextUrl.clone();
        url.pathname = "/panel";
        return NextResponse.redirect(url);
      }
    } catch {
      // Supabase unreachable - allow request through; page may show its own error.
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
