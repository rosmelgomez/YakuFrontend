let refreshRequest: Promise<boolean> | null = null;

export function refreshSession(baseUrl: string): Promise<boolean> {
  // access_token/refresh_token son cookies httpOnly: el JS del navegador no
  // puede leerlas para saber si existen. Pero si nunca hubo un login exitoso
  // en este navegador tampoco existe 'yaku_user' en localStorage (se guarda
  // junto con las cookies de sesion), asi que usamos eso como senal barata
  // para no intentar un refresh que sabemos que va a fallar por falta de
  // cookie (visitante nuevo o que ya cerro sesion).
  if (typeof window !== 'undefined' && !localStorage.getItem('yaku_user')) {
    return Promise.resolve(false);
  }

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
