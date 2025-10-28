import { ClientOnly } from '../../../../components/ClientOnly'
import ErrorBoundary from '../../../../components/stunts-app/ErrorBoundary'
import React from 'react'
import { useParams } from '../../../../hooks/useRouter'
import { AdEditor } from '@renderer/components/stunts-app/AdEditor'

export default function Ads() {
  const { projectId } = useParams('/project/:projectId/ads')

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {/* Wrap with Suspense */}
      <ErrorBoundary>
        {/* Error Boundary */}
        <ClientOnly>
          <AdEditor projectId={projectId} />
        </ClientOnly>
      </ErrorBoundary>
    </React.Suspense>
  )
}
