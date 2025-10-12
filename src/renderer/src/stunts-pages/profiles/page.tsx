import React, { useEffect, useState } from 'react'
import { useRouter } from '../../hooks/useRouter'
import { ProfileSelector } from '../../components/ProfileSelector'
import { getOrCreateDefaultProject } from '../../fetchers/projects'
import { useLocalStorage } from '@uidotdev/usehooks'
import { AuthToken } from '../../fetchers/projects'

export default function ProfilesPage() {
  const router = useRouter()
  const [shouldShowSelector, setShouldShowSelector] = useState(false)
  const [authToken] = useLocalStorage<AuthToken | null>('auth-token', null)
  const [isRedirecting, setIsRedirecting] = useState(false)

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

  const handleProfileSelected = async (userId: string) => {
    // Get or create default project and redirect to it
    setIsRedirecting(true)
    try {
      const projectId = await getOrCreateDefaultProject(authToken)
      localStorage.setItem('stored-project', JSON.stringify({ project_id: projectId }))
      setTimeout(() => {
        router.push(`/project/${projectId}/videos`)
      }, 500)
    } catch (error) {
      console.error('Error getting/creating default project:', error)
      // Fallback to projects page on error
      setTimeout(() => {
        router.push('/projects')
      }, 500)
    }
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
      {isRedirecting ? (
        <div className="text-gray-600 dark:text-gray-400">Loading project...</div>
      ) : (
        <ProfileSelector onProfileSelected={handleProfileSelected} />
      )}
    </div>
  )
}
