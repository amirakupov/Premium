import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "access_token";
const PROTECTED = ["/admin"];

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isProtected = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
    const isLogin = pathname === "/login";

    const session = req.cookies.get(COOKIE_NAME)?.value;

    if (isProtected && !session) {
        const url = req.nextUrl.clone();
        url.pathname = "/login";
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
    }

    if (isLogin && session) {
        const url = req.nextUrl.clone();
        url.pathname = "/admin";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/admin/:path*", "/login"],
};
