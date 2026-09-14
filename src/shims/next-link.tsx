// src/shims/next-link.tsx
import React from 'react';
import { Link as RouterLink, LinkProps as RouterLinkProps } from 'react-router-dom';

export interface NextLinkProps extends Omit<RouterLinkProps, 'to' | 'prefetch'> {
  href: string | { pathname: string; query?: any };
  passHref?: boolean;
  prefetch?: boolean | any;
  replace?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  locale?: string | false;
  children?: React.ReactNode;
  [key: string]: any;
}

export default function Link({
  href,
  children,
  passHref,
  prefetch,
  replace,
  scroll,
  shallow,
  locale,
  ...props
}: NextLinkProps) {
  const to = typeof href === 'object' ? href.pathname : href;
  return (
    <RouterLink to={to} replace={replace} {...props}>
      {children}
    </RouterLink>
  );
}
