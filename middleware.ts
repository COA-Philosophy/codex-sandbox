// path: middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })
  
  // Cookie を最新化（localStorage → Cookie 同期）
  await supabase.auth.getSession()
  
  return res
}

// /api を含めて全部通す（静的配信など除外）
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}