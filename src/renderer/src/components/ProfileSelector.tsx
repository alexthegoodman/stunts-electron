import React, { useEffect, useState } from 'react'
import { setCurrentProfile } from '../lib/getCurrentUserId'

interface User {
  id: string
  name: string
  email?: string
  createdAt: string
}

interface ProfileSelectorProps {
  onProfileSelected?: (userId: string) => void
}

export function ProfileSelector({ onProfileSelected }: ProfileSelectorProps) {
  const [profiles, setProfiles] = useState<User[]>([])
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newProfileName, setNewProfileName] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProfiles()
    // Load the currently selected profile from localStorage
    const currentProfile = localStorage.getItem('selected-profile-id')
    if (currentProfile) {
      setSelectedProfileId(currentProfile)
    }
  }, [])

  const loadProfiles = async () => {
    try {
      const result = await window.api.settings.getAllUsers()
      if (result.success) {
        setProfiles(result.data)
      } else {
        setError('Failed to load profiles')
      }
    } catch (err) {
      setError('Error loading profiles')
      console.error(err)
    }
  }

  const handleSelectProfile = (userId: string) => {
    setSelectedProfileId(userId)
    setCurrentProfile(userId)
    onProfileSelected?.(userId)
  }

  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) {
      setError('Profile name cannot be empty')
      return
    }

    try {
      const result = await window.api.settings.createUser({
        name: newProfileName.trim(),
        role: 'USER'
      })

      if (result.success) {
        await loadProfiles()
        setNewProfileName('')
        setIsCreating(false)
        handleSelectProfile(result.data.id)
      } else {
        setError(result.error || 'Failed to create profile')
      }
    } catch (err) {
      setError('Error creating profile')
      console.error(err)
    }
  }

  const handleDeleteProfile = async (userId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent profile selection when clicking delete

    if (profiles.length <= 1) {
      setError('Cannot delete the last profile')
      return
    }

    if (!confirm('Are you sure you want to delete this profile?')) {
      return
    }

    try {
      const result = await window.api.settings.deleteUser(userId)

      if (result.success) {
        await loadProfiles()

        // If we deleted the current profile, select the first remaining one
        if (selectedProfileId === userId) {
          const remainingProfiles = profiles.filter((p) => p.id !== userId)
          if (remainingProfiles.length > 0) {
            handleSelectProfile(remainingProfiles[0].id)
          }
        }
      } else {
        setError(result.error || 'Failed to delete profile')
      }
    } catch (err) {
      setError('Error deleting profile')
      console.error(err)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Select Profile</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right font-bold"
          >
            ×
          </button>
        </div>
      )}

      <div className="space-y-2 mb-4">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            onClick={() => handleSelectProfile(profile.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedProfileId === profile.id
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                  {profile.name}
                </h3>
                {profile.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{profile.email}</p>
                )}
              </div>
              {profiles.length > 1 && (
                <button
                  onClick={(e) => handleDeleteProfile(profile.id, e)}
                  className="text-red-500 hover:text-red-700 text-xl px-2"
                  title="Delete profile"
                >
                  ×
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {isCreating ? (
        <div className="mt-4 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <input
            type="text"
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateProfile()}
            placeholder="Enter profile name"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                     bg-white dark:bg-gray-700 text-gray-900 dark:text-white mb-2"
            autoFocus
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateProfile}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
            >
              Create
            </button>
            <button
              onClick={() => {
                setIsCreating(false)
                setNewProfileName('')
              }}
              className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-600 text-gray-900 dark:text-white rounded-md hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsCreating(true)}
          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg
                   hover:border-gray-400 dark:hover:border-gray-500 text-gray-600 dark:text-gray-400
                   hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          + New Profile
        </button>
      )}
    </div>
  )
}
