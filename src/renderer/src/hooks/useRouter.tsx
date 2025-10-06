import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

interface RouterContextType {
  currentPath: string
  push: (path: string) => void
  replace: (path: string) => void
  back: () => void
  forward: () => void
}

const RouterContext = createContext<RouterContextType | undefined>(undefined)

interface RouterProviderProps {
  children: ReactNode
  initialPath?: string
}

/**
 * Router provider for Electron app
 * Manages client-side navigation state
 */
export function RouterProvider({ children, initialPath = '/' }: RouterProviderProps) {
  const [history, setHistory] = useState<string[]>([initialPath])
  const [currentIndex, setCurrentIndex] = useState(0)

  const currentPath = history[currentIndex]

  console.info('currentPath', currentPath)

  const push = useCallback(
    (path: string) => {
      setHistory((prev) => {
        console.info('push ', path)
        // Remove any forward history when pushing a new path
        const newHistory = prev.slice(0, currentIndex + 1)
        return [...newHistory, path]
      })
      setCurrentIndex((prev) => prev + 1)
    },
    [currentIndex]
  )

  const replace = useCallback(
    (path: string) => {
      setHistory((prev) => {
        const newHistory = [...prev]
        newHistory[currentIndex] = path
        return newHistory
      })
    },
    [currentIndex]
  )

  const back = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }, [currentIndex])

  const forward = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex((prev) => prev + 1)
    }
  }, [currentIndex, history.length])

  const value: RouterContextType = {
    currentPath,
    push,
    replace,
    back,
    forward
  }

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

/**
 * Hook to access router functionality
 * Use this in components to navigate programmatically
 */
export function useRouter(): RouterContextType {
  const context = useContext(RouterContext)
  if (!context) {
    throw new Error('useRouter must be used within a RouterProvider')
  }
  return context
}

/**
 * Hook to get current route path
 */
export function usePathname(): string {
  const { currentPath } = useRouter()
  return currentPath
}

/**
 * Hook to get search params from current path
 */
export function useSearchParams(): URLSearchParams {
  const { currentPath } = useRouter()
  const searchString = currentPath.split('?')[1] || ''
  return new URLSearchParams(searchString)
}

/**
 * Hook to extract route parameters from the current path
 *
 * @example
 * // For route pattern '/project/:id' and path '/project/123'
 * const params = useParams('/project/:id');
 * console.log(params.id); // '123'
 */
export function useParams(pattern: string): Record<string, string> {
  const { currentPath } = useRouter()
  const cleanPathname = currentPath.split('?')[0]
  const cleanPattern = pattern.split('?')[0]

  const patternParts = cleanPattern.split('/')
  const pathnameParts = cleanPathname.split('/')

  const params: Record<string, string> = {}

  patternParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      const paramName = part.slice(1)
      params[paramName] = pathnameParts[index] || ''
    }
  })

  return params
}
