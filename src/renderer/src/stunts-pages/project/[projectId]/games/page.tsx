import { ClientOnly } from '../../../../components/ClientOnly'
import ErrorBoundary from '../../../../components/stunts-app/ErrorBoundary'
import { VideoEditor } from '../../../../components/stunts-app/VideoEditor'
import React from 'react'
import { useParams } from '../../../../hooks/useRouter'
import { useTranslation } from 'react-i18next'
import { GameEditor } from '@renderer/components/stunts-app/GameEditor'

export default function Games() {
  const { t } = useTranslation('common')

  const { projectId } = useParams('/project/:projectId/games')

  return (
    <React.Suspense fallback={<div>{t('Loading')}...</div>}>
      {/* Wrap with Suspense */}
      <ErrorBoundary>
        {/* Error Boundary */}
        <ClientOnly>
          {/* <div className="mx-auto">
            <VideoEditor projectId={projectId} />
          </div> */}
          <GameEditor projectId={projectId} />
        </ClientOnly>
      </ErrorBoundary>
    </React.Suspense>
  )
}
