import { RouterProvider } from './hooks/useRouter'
import { Router } from './components/Router'
// import './i18n/config'

// Import pages
import Profiles from './stunts-pages/profiles/page'
import Projects from './stunts-pages/projects/page'
import CreateProject from './stunts-pages/create-project/page'
import SelectLanguage from './stunts-pages/select-language/page'
import OnboardingCarousel from './stunts-pages/onboarding-carousel/page'
import Project from './stunts-pages/project/[projectId]/page'
import ProjectLayout from './stunts-pages/project/[projectId]/layout'
import ChoosePath from './stunts-pages/project/[projectId]/choose-path/page'
import Videos from './stunts-pages/project/[projectId]/videos/page'
import Documents from './stunts-pages/project/[projectId]/documents/page'
import Slides from './stunts-pages/project/[projectId]/slides/page'
import Books from './stunts-pages/project/[projectId]/books/page'
import Market from './stunts-pages/project/[projectId]/market/page'
import ProjectSettings from './stunts-pages/project/[projectId]/settings/page'
import FlowContent from './stunts-pages/project/[projectId]/flows/[flowId]/content/page'
import FlowQuestions from './stunts-pages/project/[projectId]/flows/[flowId]/questions/page'

function App(): React.JSX.Element {
  return (
    <RouterProvider initialPath="/profiles">
      <Router
        routes={[
          // Root routes
          { path: '/profiles', component: <Profiles /> },
          { path: '/projects', component: <Projects /> },
          { path: '/create-project', component: <CreateProject /> },
          { path: '/select-language', component: <SelectLanguage /> },
          { path: '/onboarding', component: <OnboardingCarousel /> },

          // Project routes (with layout)
          {
            path: '/project/:projectId',
            component: (
              <ProjectLayout>
                <Project />
              </ProjectLayout>
            ),
            exact: true
          },
          {
            path: '/project/:projectId/choose-path',
            component: (
              <ProjectLayout>
                <ChoosePath />
              </ProjectLayout>
            )
          },
          {
            path: '/project/:projectId/videos',
            component: (
              <ProjectLayout>
                <Videos />
              </ProjectLayout>
            )
          },
          {
            path: '/project/:projectId/documents',
            component: (
              <ProjectLayout>
                <Documents />
              </ProjectLayout>
            )
          },
          {
            path: '/project/:projectId/slides',
            component: (
              <ProjectLayout>
                <Slides />
              </ProjectLayout>
            )
          },
          {
            path: '/project/:projectId/books',
            component: (
              <ProjectLayout>
                <Books />
              </ProjectLayout>
            )
          },
          {
            path: '/project/:projectId/market',
            component: (
              <ProjectLayout>
                <Market />
              </ProjectLayout>
            )
          },
          {
            path: '/project/:projectId/settings',
            component: (
              <ProjectLayout>
                <ProjectSettings />
              </ProjectLayout>
            )
          },

          // Flow routes (without layout)
          {
            path: '/project/:projectId/flows/:flowId/content',
            component: <FlowContent />
          },
          {
            path: '/project/:projectId/flows/:flowId/questions',
            component: <FlowQuestions />
          }
        ]}
        fallback={<div className="p-8">404 - Page not found</div>}
      />
    </RouterProvider>
  )
}

export default App
