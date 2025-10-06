# Next.js to Electron Migration Guide

This guide covers the changes made to convert your Next.js app to Electron-Vite.

## 1. Fetchers (API Calls)

### What Changed
Previously, fetchers used `fetch()` to make HTTP requests to Next.js API routes. Now they use Electron's IPC (Inter-Process Communication) to communicate between renderer and main processes.

### How to Use

The fetcher functions work the same way from your components' perspective, but now they use `window.api` instead of HTTP requests:

```typescript
// ✅ Same API as before - no changes needed in components
const projects = await getProjects(authToken);
const project = await getSingleProject(authToken, projectId);
await createProject(token, name, emptyVideoData, emptyDocData, emptyPresData);
```

### Available IPC Methods

All available through `window.api`:

```typescript
// Projects
window.api.projects.getAll(userId)
window.api.projects.getSingle(projectId)
window.api.projects.create({ userId, name, emptyVideoData, emptyDocData, emptyPresData })
window.api.projects.update({ projectId, fileData })
window.api.projects.updateSequences({ projectId, fileData })
window.api.projects.updateSettings({ projectId, fileData })
window.api.projects.updateTimeline({ projectId, fileData })
window.api.projects.delete(projectId)
window.api.projects.createDemo(userId)

// Uploads
window.api.uploads.saveImage({ fileName, buffer, mimeType })
window.api.uploads.saveVideo({ fileName, buffer, mimeType })
window.api.uploads.getImage(fileName)
window.api.uploads.getVideo(fileName)

// Settings
window.api.settings.get(userId)
window.api.settings.update({ userId, settings })

// Brands
window.api.brands.getAll(userId)
window.api.brands.create({ userId, name, brandData })
window.api.brands.update({ brandId, brandData })
window.api.brands.delete(brandId)

// AI Generation
window.api.aiGeneration.generateImages({ prompts, userId })
window.api.aiGeneration.generateContent({ prompt, links, questions })
```

## 2. Link Component (Navigation)

### What Changed
Next.js `Link` component is replaced with a custom routing system for Electron.

### Migration Steps

1. **Replace imports:**
```typescript
// ❌ Before (Next.js)
import Link from 'next/link';

// ✅ After (Electron)
import Link from '@/components/Link';
```

2. **Wrap your app with RouterProvider:**
```typescript
import { RouterProvider } from '@/hooks/useRouter';
import { Router } from '@/components/Router';

function App() {
  return (
    <RouterProvider initialPath="/">
      <Router
        routes={[
          { path: '/', component: <HomePage />, exact: true },
          { path: '/project/:id', component: <ProjectPage /> },
          { path: '/settings', component: <SettingsPage /> }
        ]}
        fallback={<NotFoundPage />}
      />
    </RouterProvider>
  );
}
```

3. **Use Link component (same API as Next.js):**
```typescript
// Works exactly like Next.js Link
<Link href="/projects">View Projects</Link>
<Link href="/project/123">View Project</Link>
<Link href="/settings" replace>Settings</Link>
```

### Programmatic Navigation

```typescript
import { useRouter } from '@/hooks/useRouter';

function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push('/projects');
    // or
    router.replace('/projects');
    // or
    router.back();
    // or
    router.forward();
  };

  return <button onClick={handleClick}>Navigate</button>;
}
```

### Route Parameters

```typescript
import { useParams } from '@/components/Router';

function ProjectPage() {
  // For route pattern '/project/:id'
  const params = useParams('/project/:id');
  const projectId = params.id;

  return <div>Project ID: {projectId}</div>;
}
```

### Other Hooks

```typescript
import { usePathname, useSearchParams } from '@/hooks/useRouter';

function MyComponent() {
  const pathname = usePathname(); // e.g., '/project/123'
  const searchParams = useSearchParams(); // URLSearchParams from query string

  const id = searchParams.get('id');

  return <div>Current path: {pathname}</div>;
}
```

## 3. TODO Items

The following items need attention in the codebase:

### User ID Management
Several fetchers have placeholder `userId = 'current-user-id'` that need to be replaced with actual user ID from your auth system:

- `src/renderer/src/fetchers/projects.ts` (getProjects, createProject, createDemoProject)
- `src/renderer/src/fetchers/users.ts` (updateUserLanguage)

**Solution:** Create a user context or hook to manage the current user's ID:

```typescript
// Example: src/renderer/src/hooks/useCurrentUser.ts
export function useCurrentUser() {
  // Get from localStorage, context, or state management
  const userId = localStorage.getItem('userId');
  return { userId };
}

// Then in fetchers:
import { useCurrentUser } from '@/hooks/useCurrentUser';

const { userId } = useCurrentUser();
const result = await window.api.projects.getAll(userId);
```

## 4. Files Modified

- `src/preload/index.ts` - Added IPC method definitions
- `src/preload/index.d.ts` - Added TypeScript definitions for window.api
- `src/renderer/src/fetchers/projects.ts` - Converted to use IPC
- `src/renderer/src/fetchers/users.ts` - Converted to use IPC

## 5. Files Created

- `src/renderer/src/components/Link.tsx` - Drop-in replacement for Next.js Link
- `src/renderer/src/components/Router.tsx` - Router component and useParams hook
- `src/renderer/src/hooks/useRouter.tsx` - Router provider and navigation hooks

## 6. Example App Structure

```typescript
// src/renderer/src/App.tsx
import { RouterProvider } from './hooks/useRouter';
import { Router } from './components/Router';
import HomePage from './pages/HomePage';
import ProjectPage from './pages/ProjectPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  return (
    <RouterProvider initialPath="/">
      <Router
        routes={[
          { path: '/', component: <HomePage />, exact: true },
          { path: '/project/:id', component: <ProjectPage /> },
          { path: '/settings', component: <SettingsPage /> }
        ]}
        fallback={<div>404 - Page not found</div>}
      />
    </RouterProvider>
  );
}

export default App;
```

## 7. Testing

After migration, test the following:

1. ✅ Navigation between pages works
2. ✅ Link component handles clicks correctly
3. ✅ Back/forward navigation works
4. ✅ Route parameters are extracted correctly
5. ✅ Fetchers successfully communicate with IPC handlers
6. ✅ File uploads/downloads work through IPC
7. ✅ Error handling works for failed IPC calls

## 8. Benefits of This Migration

- **Offline First:** No need for HTTP server, everything works locally
- **Better Performance:** Direct IPC is faster than HTTP requests
- **Type Safety:** Full TypeScript support for IPC methods
- **Simpler Architecture:** No need to manage API routes
- **Better Security:** No exposed HTTP endpoints
