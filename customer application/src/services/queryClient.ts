import { QueryClient } from '@tanstack/react-query';

/**
 * Retry policy tuned for the Render free-tier backend:
 * the first request after an idle period can fail while the service spins up,
 * so transient network failures are retried before surfacing an error.
 * 401/403 are auth problems — never retried (the api client refreshes/deploys
 * the session itself).
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false;
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status === 401 || status === 403) return false;
  return true;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry:shouldRetry,
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 4000),
      staleTime: 30 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
