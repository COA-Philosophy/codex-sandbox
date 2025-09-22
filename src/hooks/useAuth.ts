// path: src/hooks/useAuth.ts
'use client'

import { useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { useUserStore } from '../store/userStore'
import { 
  type User, 
  type AuthState, 
  type LoginCredentials, 
  type SignupCredentials,
  INTERNAL_USER_ID,
  getEnvironment,
  isInternalMode
} from '@/types/common'

export function useAuth() {
  const [loading, setLoading] = useState(true)
  const { user, setUser, clearUser } = useUserStore()
  const mode = isInternalMode() ? 'internal' : 'multi'
  const environment = getEnvironment()

  const authState: AuthState = {
    user,
    loading,
    mode,
    environment,
  }

  // Internal Mode初期化
  useEffect(() => {
    if (mode === 'internal') {
      const internalUser: User = {
        id: INTERNAL_USER_ID,
        email: 'internal@dev.local',
        display_name: 'Internal Dev User',
        environment,
      }
      setUser(internalUser)
      setLoading(false)
      return
    }

    // Multi-user Mode: Supabase認証
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSupabaseUser(session.user)
      } else {
        clearUser()
      }
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          handleSupabaseUser(session.user)
        } else {
          clearUser()
        }
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [mode, environment, setUser, clearUser])

  const handleSupabaseUser = async (supabaseUser: SupabaseUser) => {
    // v2_usersテーブルからユーザー情報取得
    const { data } = await supabase
      .from('v2_users')
      .select('*')
      .eq('id', supabaseUser.id)
      .eq('environment', environment)
      .single()

    const user: User = {
      id: supabaseUser.id,
      email: supabaseUser.email,
      display_name: data?.display_name || supabaseUser.user_metadata?.display_name,
      working_style_data: data?.working_style_data || {},
      created_at: data?.created_at,
      environment,
    }

    setUser(user)
  }

  const signIn = async (credentials: LoginCredentials) => {
    if (mode === 'internal') {
      throw new Error('Sign-in is disabled in Internal Mode')
    }

    const { error } = await supabase.auth.signInWithPassword(credentials)
    if (error) throw error
  }

  const signUp = async (credentials: SignupCredentials) => {
    if (mode === 'internal') {
      throw new Error('Sign-up is disabled in Internal Mode')
    }

    const { data, error } = await supabase.auth.signUp({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) throw error

    // v2_usersテーブルにユーザー情報保存
    if (data.user) {
      await supabase.from('v2_users').insert({
        id: data.user.id,
        email: data.user.email,
        display_name: credentials.displayName || null,
        environment,
      })
    }
  }

  const signOut = async () => {
    if (mode === 'internal') {
      throw new Error('Sign-out is disabled in Internal Mode')
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return {
    ...authState,
    signIn,
    signUp,
    signOut,
  }
}