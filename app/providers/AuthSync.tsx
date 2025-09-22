// path: app/providers/AuthSync.tsx
'use client'
import { useEffect } from 'react'

export default function AuthSync() {
  useEffect(() => {
    console.debug('[orchestra] AuthSync initialized - using existing window.supabase')

    // 既存のwindow.supabaseが利用可能になるまで待機
    const waitForSupabase = () => {
      if (typeof window !== 'undefined' && (window as any).supabase) {
        const supabase = (window as any).supabase
        console.debug('[orchestra] Found existing supabase client')

        // 認証状態変化の監視とサーバー同期
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event: string, session: any) => {
            console.debug('[orchestra] Auth state changed:', { event, hasSession: !!session })

            try {
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event, session })
              })
              console.debug('[orchestra] Auth sync completed')
            } catch (error) {
              console.error('[orchestra] Auth sync failed:', error)
            }
          }
        )

        // 初回セッション同期（ページロード時）
        const syncInitialSession = async () => {
          const { data: { session } } = await supabase.auth.getSession()
          console.debug('[orchestra] Initial session check:', { hasSession: !!session })
          
          if (session) {
            try {
              await fetch('/api/auth/session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ event: 'SIGNED_IN', session })
              })
              console.debug('[orchestra] Initial session synced')
            } catch (error) {
              console.error('[orchestra] Initial session sync failed:', error)
            }
          }
        }

        syncInitialSession()

        // クリーンアップ関数を返す
        return () => {
          console.debug('[orchestra] AuthSync cleanup')
          subscription.unsubscribe()
        }
      } else {
        // window.supabaseが利用可能になるまで再試行
        setTimeout(waitForSupabase, 100)
      }
    }

    const cleanup = waitForSupabase()
    return cleanup
  }, [])

  return null
}