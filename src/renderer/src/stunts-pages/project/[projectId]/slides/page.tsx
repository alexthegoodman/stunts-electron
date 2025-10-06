import { ClientOnly } from '../../../../components/ClientOnly'
import ErrorBoundary from '../../../../components/stunts-app/ErrorBoundary'
import React from 'react'
import { useParams } from '../../../../hooks/useRouter'

export default function Slides() {
  const { projectId } = useParams('/project/:projectId/slides')

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {/* Wrap with Suspense */}
      <ErrorBoundary>
        {/* Error Boundary */}
        <ClientOnly>
          <div className="mx-auto">
            <h1>Slides</h1>
          </div>
        </ClientOnly>
      </ErrorBoundary>
    </React.Suspense>
  )
}
