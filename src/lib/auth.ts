/**
 * Envuelve chrome.identity.getAuthToken (callback API) en promesas.
 * Usa el client_id/scopes declarados en manifest.json -> no hay que
 * gestionar redirect URIs a mano.
 */

export class AuthError extends Error {}

export async function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const err = chrome.runtime.lastError;
      if (err || !token) {
        reject(new AuthError(err?.message ?? 'No se obtuvo token de Google'));
        return;
      }
      resolve(token);
    });
  });
}

export async function signOut(): Promise<void> {
  const token = await getAuthToken(false).catch(() => null);
  if (!token) return;

  await new Promise<void>((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });

  // Revoca el token en Google para forzar el consentimiento en el proximo login.
  await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => {});
}

/** Si el token cacheado ya no es valido (401), lo limpia para forzar uno nuevo. */
export async function dropInvalidToken(token: string): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}
