import React, { ReactNode } from 'react';
import { usePathname } from '../hooks/useRouter';

interface Route {
  path: string;
  component: ReactNode;
  exact?: boolean;
}

interface RouterProps {
  routes: Route[];
  fallback?: ReactNode;
}

/**
 * Simple router component that renders based on current path
 * Use this to define your app's routes
 *
 * @example
 * <Router
 *   routes={[
 *     { path: '/', component: <HomePage />, exact: true },
 *     { path: '/project/:id', component: <ProjectPage /> },
 *     { path: '/settings', component: <SettingsPage /> }
 *   ]}
 *   fallback={<NotFoundPage />}
 * />
 */
export function Router({ routes, fallback }: RouterProps) {
  const pathname = usePathname();

  // Find matching route
  for (const route of routes) {
    const match = matchPath(pathname, route.path, route.exact);
    if (match) {
      return <>{route.component}</>;
    }
  }

  // Render fallback if no route matches
  return <>{fallback || <div>404 - Page not found</div>}</>;
}

/**
 * Match a pathname against a route pattern
 * Supports dynamic segments like /project/:id
 */
function matchPath(pathname: string, pattern: string, exact = false): boolean {
  // Remove query string for matching
  const cleanPathname = pathname.split('?')[0];
  const cleanPattern = pattern.split('?')[0];

  if (exact) {
    return cleanPathname === cleanPattern;
  }

  // Convert pattern to regex
  const regexPattern = cleanPattern
    .replace(/:[^/]+/g, '[^/]+') // Replace :param with wildcard
    .replace(/\//g, '\\/'); // Escape slashes

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(cleanPathname);
}
