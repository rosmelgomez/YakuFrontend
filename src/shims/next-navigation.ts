import { useNavigate, useLocation, useSearchParams as useRouterSearchParams } from 'react-router-dom';
import { prefetchRoute } from '@/lib/prefetch';

export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (url: string) => navigate(url),
    replace: (url: string) => navigate(url, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => window.location.reload(),
    prefetch: (url: string) => prefetchRoute(url),
  };
}

export function usePathname() {
  const location = useLocation();
  return location.pathname;
}

export function useSearchParams() {
  const [searchParams] = useRouterSearchParams();
  return searchParams;
}

export function redirect(url: string) {
  window.location.href = url;
}
