// path: src/components/auth/ProfileSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useUserStore } from '@/store/userStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { supabase } from '@/lib/supabase'
import type { ProfileUpdateData } from '@/types/common'

export function ProfileSettings() {
  const { user, mode, environment } = useAuth()
  const { updateProfile } = useUserStore()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [formData, setFormData] = useState<ProfileUpdateData>({
    display_name: '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        display_name: user.display_name || '',
        working_style_data: user.working_style_data || {},
      })
    }
  }, [user])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'internal') {
        // Internal Mode: ローカル状態のみ更新
        updateProfile(formData)
        setMessage({ type: 'success', text: 'Profile updated locally' })
      } else {
        // Multi-user Mode: Supabaseに保存
        const { error } = await supabase
          .from('v2_users')
          .update({
            display_name: formData.display_name,
            working_style_data: formData.working_style_data,
          })
          .eq('id', user.id)
          .eq('environment', environment)

        if (error) throw error

        updateProfile(formData)
        setMessage({ type: 'success', text: 'Profile updated successfully' })
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update profile'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof ProfileUpdateData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }))
  }

  if (!user) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <p className="text-neutral-400">Please sign in to view profile settings</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>
          Manage your account information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-neutral-200">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={user.email || ''}
              disabled
              className="bg-neutral-800/40"
            />
            <p className="text-xs text-neutral-500">Email cannot be changed</p>
          </div>

          <div className="space-y-2">
            <label htmlFor="displayName" className="text-sm font-medium text-neutral-200">
              Display Name
            </label>
            <Input
              id="displayName"
              type="text"
              value={formData.display_name || ''}
              onChange={handleInputChange('display_name')}
              placeholder="Enter your display name"
            />
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium text-neutral-200">Account Info</div>
            <div className="rounded-lg border border-neutral-700 bg-neutral-800/40 p-3 text-xs space-y-1">
              <div>Mode: <span className="text-neutral-300">{mode}</span></div>
              <div>Environment: <span className="text-neutral-300">{environment}</span></div>
              <div>User ID: <span className="font-mono text-neutral-300">{user.id}</span></div>
            </div>
          </div>

          {message && (
            <div className={`rounded-md border p-3 ${
              message.type === 'success'
                ? 'border-green-600 bg-green-50/10 text-green-400'
                : 'border-red-600 bg-red-50/10 text-red-400'
            }`}>
              <p className="text-sm">{message.text}</p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}