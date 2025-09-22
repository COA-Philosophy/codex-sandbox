// path: src/store/userStore.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, ProfileUpdateData } from '@/types/common'

interface UserState {
  user: User | null
  setUser: (user: User | null) => void
  clearUser: () => void
  updateProfile: (data: ProfileUpdateData) => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,

      setUser: (user) => set({ user }),

      clearUser: () => set({ user: null }),

      updateProfile: (data) => {
        const currentUser = get().user
        if (!currentUser) return

        const updatedUser: User = {
          ...currentUser,
          display_name: data.display_name ?? currentUser.display_name,
          working_style_data: {
            ...currentUser.working_style_data,
            ...data.working_style_data,
          },
        }

        set({ user: updatedUser })
      },
    }),
    {
      name: 'user-storage',
      partialize: (state) => ({ user: state.user }),
    }
  )
)