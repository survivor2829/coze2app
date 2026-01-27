import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionFromRequest } from "./lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 只保护 /admin 路由（登录页除外）
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const isAuthenticated = verifySessionFromRequest(request);

    if (!isAuthenticated) {
      const loginUrl = new URL("/admin/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 已登录用户访问登录页时重定向到后台首页
  if (pathname === "/admin/login") {
    const isAuthenticated = verifySessionFromRequest(request);

    if (isAuthenticated) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
