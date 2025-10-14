import { NavButton } from '../../../components/stunts-app/items'
import { useParams } from '../../../hooks/useRouter'
import { usePathname } from '../../../hooks/useRouter'

import { Toaster } from 'react-hot-toast'
import { useTranslation } from 'react-i18next'
import { ThemeSelector } from '../../../components/ThemeSelector'
import { ProjectSelector } from '../../../components/ProjectSelector'
import { getSingleProject } from '../../../fetchers/projects'
import useSWR from 'swr'

export default function ProjectLayout({ children = null }: { children: any }) {
  const { t } = useTranslation('common')

  const { projectId } = useParams('/project/:projectId')
  const pathname = usePathname()

  // const { data: project } = useSWR(projectId ? `project-${projectId}` : null, () =>
  //   getSingleProject('', projectId)
  // )

  let hubUrl = `/project/${projectId}`
  if (pathname.includes('flows') || pathname === hubUrl || pathname === hubUrl + '/') {
    return (
      <>
        <Toaster position="bottom-left" reverseOrder={false} />
        {children}
      </>
    )
  }

  return (
    <>
      <Toaster position="bottom-left" reverseOrder={false} />
      <div
        className="flex flex-row p-4 w-full min-h-screen transition-colors duration-300"
        style={{ backgroundColor: `rgb(var(--theme-bg-primary))` }}
      >
        <div className="flex flex-col gap-4 mr-4">
          <ThemeSelector />

          <NavButton label={t('Video')} icon="video" destination={`/project/${projectId}/videos`} />

          <NavButton label={t('Ads')} icon="stack-plus" destination={`/project/${projectId}/ads`} />

          <NavButton label={t('Copy')} icon="text" destination={`/project/${projectId}/copy`} />

          <NavButton
            label={t('Library')}
            icon="book"
            destination={`/project/${projectId}/assets`}
          />

          {/* <NavButton
            label={t("Document")}
            icon="file-cloud"
            destination={`/project/${projectId}/documents`}
          /> */}
          {/* <NavButton
            label="Slides"
            icon="presentation"
            destination={`/project/${projectId}/slides`}
          />
          <NavButton
            label="Promos"
            icon="squares"
            destination={`/project/${projectId}/promos`}
          /> */}
          {/* <NavButton
            label="Market"
            icon="market"
            destination={`/project/${projectId}/market`}
          /> */}
          {/* <NavButton
            label="Books"
            icon="book"
            destination={`/project/${projectId}/books`}
          /> */}
          <NavButton
            label={t('Settings')}
            icon="gear"
            destination={`/project/${projectId}/settings`}
          />
        </div>
        {children}
      </div>
    </>
  )
}
