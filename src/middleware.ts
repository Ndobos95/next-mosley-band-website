import { NextResponse } from "next/server"

export async function middleware() {
  // No authentication checks here - handled at page level
  // Middleware runs on Edge Runtime which has limitations with Prisma
  return NextResponse.next()
}

export const config = {
  matcher: ["/dashboard/:path*"]
}