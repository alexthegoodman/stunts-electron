import { ClientOnly } from '../../../../components/ClientOnly'
import ErrorBoundary from '../../../../components/stunts-app/ErrorBoundary'
import React from 'react'
import { useParams } from '../../../../hooks/useRouter'

import { Masonry } from 'masonic'
import { MiniButton } from '@renderer/components/stunts-app/items'
import { ProjectSelector } from '@renderer/components/ProjectSelector'
import { getSingleProject } from '@renderer/fetchers/projects'
import useSWR from 'swr'
import { CopyIcon, PencilIcon, TagIcon } from '@phosphor-icons/react'

let i = 0
const items = Array.from(Array(100), () => ({ id: i++ }))

const MasonryCard = ({ index, data: { id }, width }) => (
  <div className="relative bg-slate-300 shadow-[0_0_15px_4px_rgba(0,0,0,0.16)] text-slate-600 rounded-[15px] p-8">
    {index % 3 ? (
      <p>
        Lorem ipsum dolor sit amet consectetur adipiscing elit. Quisque faucibus ex sapien vitae
        pellentesque sem placerat. In id cursus mi pretium tellus duis convallis. Tempus leo eu
        aenean sed diam urna tempor. Pulvinar vivamus fringilla lacus nec metus bibendum egestas.
        Iaculis massa nisl malesuada lacinia integer nunc posuere. Ut hendrerit semper vel class
        aptent taciti sociosqu. Ad litora torquent per conubia nostra inceptos himenaeos.
      </p>
    ) : (
      <p>
        Pulvinar vivamus fringilla lacus nec metus bibendum egestas. Iaculis massa nisl malesuada
        lacinia integer nunc posuere. Ut hendrerit semper vel class aptent taciti sociosqu. Ad
        litora torquent per conubia nostra inceptos himenaeos.
      </p>
    )}
    <a href="/" className="block underline mt-4">
      See Strucuted Input
    </a>
    <div className="flex flex-row gap-2 absolute top-4 right-4">
      <div>
        <TagIcon size={'20px'} weight="thin" />
      </div>
      <div>
        <PencilIcon size={'20px'} weight="thin" />
      </div>
      <div>
        <CopyIcon size={'20px'} weight="thin" />
      </div>
    </div>
  </div>
)

export default function Copy() {
  const { projectId } = useParams('/project/:projectId/copy')

  const { data: project } = useSWR(projectId ? `project-${projectId}` : null, () =>
    getSingleProject('', projectId)
  )

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {/* Wrap with Suspense */}
      <ErrorBoundary>
        {/* Error Boundary */}
        <ClientOnly>
          <div>
            <div className="flex flex-row justify-between gap-2 mb-4">
              <ProjectSelector
                currentProjectId={projectId}
                currentProjectName={project?.project?.name}
              />
              <div className="flex flex-row gap-2">
                <input
                  className="rounded h-[30px] py-0 px-2 text-xs w-64"
                  type="search"
                  placeholder="Search copy..."
                />
                <select className="h-[30px] text-xs bg-slate-400 px-4 rounded">
                  <option>Select Tag</option>
                </select>
              </div>
              <div>
                <button className="stunts-gradient text-xs rounded p-2">Export Copy</button>
              </div>
            </div>
            <section className="flex flex-row pt-4">
              <aside className="w-[22vw] p-4">
                <div className="flex flex-row gap-2 mb-4">
                  <MiniButton callback={() => {}} label="Select Form" />
                  <MiniButton callback={() => {}} label="Create Form" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm">Original Input</label>
                  <textarea
                    className="bg-slate-600 p-2 rounded text-xs"
                    rows={4}
                    placeholder="Original Input..."
                  ></textarea>
                  <MiniButton callback={() => {}} label="Generate Copy" />
                </div>
              </aside>
              <div className="w-[68vw] pl-8">
                {/** Copy Mosaic Grid */}{' '}
                <Masonry items={items} render={MasonryCard} columnWidth={350} columnGutter={40} />
              </div>
            </section>
          </div>
        </ClientOnly>
      </ErrorBoundary>
    </React.Suspense>
  )
}
