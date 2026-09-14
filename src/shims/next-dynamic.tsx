// src/shims/next-dynamic.tsx
import React, { Suspense, lazy } from 'react';

export default function nextDynamic<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T } | T>,
  options?: { ssr?: boolean; loading?: () => React.ReactNode }
) {
  const LazyComponent = lazy(async () => {
    const res = await importer();
    return (res && typeof res === 'object' && 'default' in res) ? res : { default: res as T };
  });

  return function DynamicComponent(props: any) {
    return (
      <Suspense fallback={options?.loading ? options.loading() : null}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}
