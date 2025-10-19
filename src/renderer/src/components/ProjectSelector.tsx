import React, { useState, useRef, useEffect } from 'react'
import { useRouter } from '../hooks/useRouter'
import { deleteProject, getProjects } from '../fetchers/projects'
import { useLocalStorage } from '@uidotdev/usehooks'
import { AuthToken } from '../fetchers/projects'
import useSWR, { mutate } from 'swr'
import { CaretDown } from '@phosphor-icons/react'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'

interface ProjectSelectorProps {
  currentProjectId: string
  currentProjectName?: string
}

export function ProjectSelector({ currentProjectId, currentProjectName }: ProjectSelectorProps) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [authToken] = useLocalStorage<AuthToken | null>('auth-token', null)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)

  const { data: projects, isLoading } = useSWR('projects', () => getProjects(authToken))

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleProjectSelect = (projectId: string) => {
    setIsOpen(false)

    if (projectId === 'new') {
      router.push('/redirect?to=/create-project')
    } else {
      // Store the project in localStorage for the next page
      localStorage.setItem('stored-project', JSON.stringify({ project_id: projectId }))
      // Use redirect page to force a full navigation
      router.push(`/redirect?to=/project/${projectId}/videos`)
    }
  }

  const handleDelete = async (
    event: React.MouseEvent<HTMLButtonElement>,
    project_label: string,
    project_id: string
  ) => {
    event.preventDefault()

    // if (!authToken || !user || user.role !== 'ADMIN') {
    //   return
    // }

    if (
      !confirm(`Are you sure you want to delete "${project_label}"? This action cannot be undone.`)
    ) {
      return
    }

    setLoading(true)

    try {
      await deleteProject('', project_id)
      mutate('projects', () => getProjects(authToken))
      toast.success('Project deleted successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete project')
    }

    setLoading(false)
  }

  const displayName =
    currentProjectName ||
    projects?.find((p) => p.project_id === currentProjectId)?.project_name ||
    'Loading...'

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-2 rounded hover:bg-gray-700 transition-colors w-full text-left border border-gray-600"
        title="Select project"
      >
        <span className="text-sm truncate w-32">{displayName}</span>
        <CaretDown
          size={16}
          weight="bold"
          className={`transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-gray-800 border border-gray-700 rounded-md shadow-lg z-50 min-w-[200px] max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="px-4 py-2 text-sm text-gray-400">{t('Loading')}...</div>
          ) : (
            <>
              {projects?.map((project) => (
                <div className="flex flex-row">
                  <button
                    key={project.project_id}
                    onClick={() => handleProjectSelect(project.project_id)}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-sm ${
                      project.project_id === currentProjectId ? 'bg-gray-700 font-semibold' : ''
                    }`}
                  >
                    {project.project_name}
                  </button>
                  <button
                    className="custom-color w-24 text-xs rounded flex items-center justify-center p-1 bg-red-500
               hover:bg-red-600 hover:cursor-pointer 
              active:bg-red-700 transition-colors text-white h-6"
                    disabled={loading}
                    onClick={(e) => handleDelete(e, project.project_name, project.project_id)}
                  >
                    {t('Delete')}
                  </button>
                </div>
              ))}
              <hr className="border-gray-700 my-1" />
              <button
                onClick={() => handleProjectSelect('new')}
                className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors text-sm text-blue-400"
              >
                + {t('Create Project')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
