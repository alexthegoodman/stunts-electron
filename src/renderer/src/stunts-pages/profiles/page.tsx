import React, { useEffect, useState } from 'react'
import { useRouter } from '../../hooks/useRouter'
import { ProfileSelector } from '../../components/ProfileSelector'

export default function ProfilesPage() {
  const router = useRouter()
  const [shouldShowSelector, setShouldShowSelector] = useState(false)

  // useEffect(() => {
  //   // Check if we're coming from the projects page (to switch profiles)
  //   const isExplicitSwitch = window.location.hash.includes('switch=true')

  //   if (isExplicitSwitch) {
  //     setShouldShowSelector(true)
  //     return
  //   }

  //   // Check if a profile is already selected
  //   const selectedProfile = localStorage.getItem('selected-profile-id')
  //   if (selectedProfile) {
  //     // Auto-redirect to projects if profile already selected
  //     router.push('/projects')
  //   } else {
  //     setShouldShowSelector(true)
  //   }
  // }, [])

  const handleProfileSelected = (userId: string) => {
    // Redirect to projects page after profile is selected
    setTimeout(() => {
      router.push('/projects')
    }, 500)
  }

  // if (!shouldShowSelector) {
  //   return (
  //     <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
  //       <div className="text-gray-600 dark:text-gray-400">Loading...</div>
  //     </div>
  //   )
  // }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <ProfileSelector onProfileSelected={handleProfileSelected} />
    </div>
  )
}
