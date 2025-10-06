import React from 'react';
import { useRouter } from '../hooks/useRouter';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  replace?: boolean;
}

/**
 * Drop-in replacement for Next.js Link component for Electron
 * Handles client-side navigation using a custom router
 */
export default function Link({
  href,
  children,
  replace = false,
  onClick,
  ...props
}: LinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Allow default behavior if user is trying to open in new tab
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) {
      return;
    }

    e.preventDefault();

    // Call custom onClick if provided
    if (onClick) {
      onClick(e);
      if (e.defaultPrevented) {
        return;
      }
    }

    // Navigate using the router
    if (replace) {
      router.replace(href);
    } else {
      router.push(href);
    }
  };

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  );
}
