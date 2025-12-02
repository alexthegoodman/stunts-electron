import { ClientOnly } from '../../../../components/ClientOnly'
import ErrorBoundary from '../../../../components/stunts-app/ErrorBoundary'
import React, { useState } from 'react'
import { useParams } from '../../../../hooks/useRouter'
import { VideoPlayer } from '@renderer/components/mosaic/VideoPlayer'
import { ProjectSelector } from '@renderer/components/ProjectSelector'

export default function Chat() {
  const [projectName, setProjectName] = useState("Loading project...");
  const { projectId } = useParams('/project/:projectId/chat')

  return (
    <React.Suspense fallback={<div>Loading...</div>}>
      {/* Wrap with Suspense */}
      <ErrorBoundary>
        {/* Error Boundary */}
        <ClientOnly>
          <div className="mx-auto">
            <div className="flex flex-row mb-2 gap-4 justify-between w-full">
              <div className="flex flex-row gap-4 items-center">
                <ProjectSelector currentProjectId={projectId} currentProjectName={projectName} />
                <h1>Chat</h1>
              </div>
            </div>
            <section className='chat flex'>
              <div className='flex flex-row'>
                <section className='w-[calc(50vw-70px)]'>
                  <section className='h-[75vh] w-[calc(50vw-270px)] pt-8'>
                    <div className='flex flex-col gap-4'>
                      <div className='flex flex-row justify-start'>
                        <div className='messageBubble rounded bg-slate-600 px-4 py-2'>
                          <span>I'd like to add a box to the scene</span>
                        </div>
                      </div>
                      <div className='flex flex-row justify-end'>
                        <div className='messageBubble rounded bg-slate-600 px-4 py-2'>
                          <span>Sure thing!</span>
                        </div>
                      </div>
                      <div className='flex flex-row justify-end'>
                        <div className='messageBubble text-green-600 rounded bg-green-100 px-4 py-2'>
                          <span>New Box added to scene</span>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section>
                    <div className='flex flex-row'>
                      <div>
                        <textarea className='w-[calc(50vw-270px)] block rounded border-gray-500 bg-slate-500' rows={4} />
                      </div>
                      <div>
                        <button className='w-[100px]'>Send</button>
                      </div>
                    </div>
                  </section>
                </section>
                <section className='w-[calc(50vw-70px)]'>
                  <VideoPlayer projectId={projectId} set_project_name={setProjectName} />
                </section>
              </div>
            </section>
          </div>
        </ClientOnly>
      </ErrorBoundary>
    </React.Suspense>
  )
}
