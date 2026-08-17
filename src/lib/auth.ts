/**
 * Wraps chrome.identity.getAuthToken (callback API) in promises.
 * Uses the client_id/scopes declared in manifest.json -> no need
 * to handle redirect URIs by hand.
 */

export class AuthError extends Error {}

export async function getAuthToken(interactive: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      const err = chrome.runtime.lastError;
      if (err || !token) {
        reject(new AuthError(err?.message ?? 'Failed to get a Google token'));
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

  // Revoke the token with Google to force consent again on the next login.
  await fetch(`https://accounts.google.com/o/oauth2/revoke?token=${token}`).catch(() => {});
}

/** If the cached token is no longer valid (401), clear it to force a fresh one. */
export async function dropInvalidToken(token: string): Promise<void> {
  await new Promise<void>((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => resolve());
  });
}
