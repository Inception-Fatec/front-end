import { auth } from "@/auth";
import { NextResponse } from "next/server";

type UserRole = "ADMIN" | "OPERATOR" | "USER";

const routePermissions: Record<string, UserRole[]> = {
  "/admin": ["ADMIN"],
  "/operacoes": ["ADMIN", "OPERATOR"],
  "/dashboard": ["ADMIN", "OPERATOR", "USER"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role as UserRole | undefined;

  if (!isLoggedIn && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  for (const [route, allowedRoles] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        return NextResponse.redirect(new URL("/nao-autorizado", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|login|forgot-password|reset-password).*)"],
};
