import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function proxy(request: NextRequest) {
    const token = request.cookies.get("bizly_token")
    const { pathname } = request.nextUrl

    if (token && pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", request.url))
    }

    if (!token && pathname.startsWith("/dashboard")) {
        return NextResponse.redirect(new URL("/", request.url))
    }

    return NextResponse.next()
}

export const config = {
    matcher: ["/", "/dashboard/:path*"],
}