import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from '../../hooks/useRouter'
import { useDevEffectOnce } from '@renderer/hooks/useDevOnce'

export default function RedirectPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const to = searchParams.get('to')

  console.info('redirect', searchParams.get('to'))

  useDevEffectOnce(() => {
    // Get the target path from search params
    // const target = searchParams.get('to')

    console.info('to', router.currentPath, to)

    if (to) {
      // Use setTimeout to ensure a full navigation cycle
      router.push(to)
    } else {
      // Fallback to profiles if no target specified
      router.push('/profiles')
    }
  })

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="text-gray-600 dark:text-gray-400">Redirecting...</div>
    </div>
  )
}
