let refreshRequest: Promise<boolean> | null = null;

export function refreshSession(baseUrl: string): Promise<boolean> {
  if (!refreshRequest) {
    refreshRequest = fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then((response) => response.ok)
      .catch(() => false)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}
