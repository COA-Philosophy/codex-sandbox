// path: app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST(req: Request) {
  try {
    const { event, session } = await req.json()
    
    // Next.js 15対応: cookies()を直接渡すのではなく、ラッパー関数を使用
    const supabase = createRouteHandlerClient({ 
      cookies: () => {
        const cookieStore = cookies()
        return cookieStore
      }
    })

    console.debug('[orchestra] Auth session sync:', { event, hasSession: !!session })

    if (event === 'SIGNED_OUT') {
      await supabase.auth.signOut()
      console.debug('[orchestra] Session signed out on server')
    } else if (session?.access_token && session?.refresh_token) {
      // クライアントのセッションをcookieへ反映
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      })
      console.debug('[orchestra] Session synced to server cookies')
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[orchestra] Auth session sync error:', error)
    return NextResponse.json(
      { error: 'Session sync failed' },
      { status: 500 }
    )
  }
}