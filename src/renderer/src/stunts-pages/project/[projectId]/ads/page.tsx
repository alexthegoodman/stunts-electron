import { ClientOnly } from '../../../../components/ClientOnly'
import ErrorBoundary from '../../../../components/stunts-app/ErrorBoundary'
import React from 'react'
import { useParams } from '../../../../hooks/useRouter'

export default function Ads() {
  const { projectId } = useParams('/project/:projectId/ads')

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {/* Wrap with Suspense */}
      <ErrorBoundary>
        {/* Error Boundary */}
        <ClientOnly>
          <div className="mx-auto">
            <h1>Ads</h1>
          </div>
        </ClientOnly>
      </ErrorBoundary>
    </React.Suspense>
  )
}
