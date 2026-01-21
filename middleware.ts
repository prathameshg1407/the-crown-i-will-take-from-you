import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth/jwt'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/profile', '/library']

// Routes that should redirect authenticated users
const authRoutes = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for API routes - let them handle auth themselves
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }
  
  // Get access token from cookie
  const accessToken = request.cookies.get('access_token')?.value
  
  let isAuthenticated = false
  
  if (accessToken) {
    try {
      await verifyToken(accessToken)
      isAuthenticated = true
    } catch (error) {
      // Token invalid or expired
      isAuthenticated = false
    }
  }
  
  // Redirect authenticated users away from auth pages
  if (authRoutes.some(route => pathname.startsWith(route)) && isAuthenticated) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  
  // Redirect unauthenticated users from protected routes
  if (protectedRoutes.some(route => pathname.startsWith(route)) && !isAuthenticated) {
    const url = new URL('/login', request.url)
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}