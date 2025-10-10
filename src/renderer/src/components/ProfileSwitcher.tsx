import React, { useEffect, useState } from 'react'
import { useRouter } from '../hooks/useRouter'

interface User {
  id: string
  name: string
  email?: string
}

export function ProfileSwitcher() {
  const [currentProfile, setCurrentProfile] = useState<User | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadCurrentProfile()
  }, [])

  const loadCurrentProfile = async () => {
    const selectedProfileId = localStorage.getItem('selected-profile-id')
    if (!selectedProfileId) return

    try {
      const result = await window.api.settings.getUser(selectedProfileId)
      if (result.success) {
        setCurrentProfile(result.data)
      }
    } catch (err) {
      console.error('Failed to load current profile:', err)
    }
  }

  const handleSwitchProfile = () => {
    router.push('/profiles')
  }

  if (!currentProfile) {
    return null
  }

  return (
    <button
      onClick={handleSwitchProfile}
      className="custom-color flex items-center gap-2 px-3 py-2 rounded-md bg-slate-600 hover:bg-slate-500 dark:hover:bg-slate-500 transition-colors"
      title="Switch profile"
    >
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
        {currentProfile.name.charAt(0).toUpperCase()}
      </div>
      <span className="text-sm font-medium text-white dark:text-white">{currentProfile.name}</span>
    </button>
  )
}
