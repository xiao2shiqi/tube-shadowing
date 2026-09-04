export interface User {
  sub: string;
  email: string;
  name: string;
  picture: string;
  /** Name the user set themselves in 个人设置; falls back to the OAuth `name`. */
  displayName?: string;
}

/** What to show for a user anywhere in the UI. */
export function userLabel(user: User): string {
  return user.displayName?.trim() || user.name || user.email;
}

interface GoogleCredentialResponse {
  credential: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | boolean | number>
          ) => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

const STORAGE_KEY = 'tube-shadowing-jwt';

export function getStoredToken(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(STORAGE_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function loadAuthConfig(): Promise<{ googleClientId: string; githubClientId: string }> {
  const res = await fetch('/api/config');
  if (!res.ok) throw new Error('Failed to load auth config');
  return res.json();
}

export function loadGoogleScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('google-gis-script')) {
      // Script already added — wait for window.google to be ready
      waitForGoogle(resolve, reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gis-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => waitForGoogle(resolve, reject);
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.body.appendChild(script);
  });
}

function waitForGoogle(resolve: () => void, reject: (e: Error) => void): void {
  const deadline = Date.now() + 5000;
  const check = () => {
    if (window.google?.accounts?.id) {
      resolve();
    } else if (Date.now() > deadline) {
      reject(new Error('Google Identity Services did not initialize in time'));
    } else {
      setTimeout(check, 50);
    }
  };
  check();
}

export function initializeGoogleSignIn(clientId: string, onCredential: (credential: string) => void): void {
  if (typeof window === 'undefined' || !window.google?.accounts?.id) return;
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response: GoogleCredentialResponse) => {
      if (response.credential) {
        onCredential(response.credential);
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
  });
}

export function renderGoogleButton(element: HTMLElement): void {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.renderButton(element, {
    theme: 'outline',
    size: 'medium',
    type: 'standard',
    text: 'signin_with',
    shape: 'pill',
    width: '160',
  });
}

export function disableGoogleAutoSelect(): void {
  if (!window.google?.accounts?.id) return;
  window.google.accounts.id.disableAutoSelect();
}

export async function exchangeGoogleToken(idToken: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Google login failed' }));
    throw new Error(err.error || 'Google login failed');
  }
  return res.json();
}

export async function fetchCurrentUser(token: string): Promise<User> {
  const res = await fetch('/api/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Session expired');
  return res.json();
}

export async function updateProfile(displayName: string): Promise<User> {
  const token = getStoredToken();
  const res = await fetch('/api/me', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ displayName }),
  });
  if (!res.ok) throw new Error('保存失败');
  return res.json();
}

// ---------- GitHub login (redirect-based OAuth code flow) ----------

const GITHUB_STATE_KEY = 'tube-shadowing-github-state';

export function githubRedirectUri(): string {
  return `${window.location.origin}/`;
}

export function startGithubLogin(clientId: string): void {
  const state = crypto.randomUUID();
  sessionStorage.setItem(GITHUB_STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: githubRedirectUri(),
    scope: 'read:user user:email',
    state,
  });
  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
}

/** Reads `?code=&state=` left by GitHub's redirect, clears them from the URL, and
 * returns the code once the state matches what we stashed before redirecting. */
export function consumeGithubCallback(): string | null {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  if (!code || !state) return null;

  const expected = sessionStorage.getItem(GITHUB_STATE_KEY);
  sessionStorage.removeItem(GITHUB_STATE_KEY);
  url.searchParams.delete('code');
  url.searchParams.delete('state');
  window.history.replaceState({}, '', url.toString());

  if (state !== expected) return null;
  return code;
}

export async function exchangeGithubCode(code: string): Promise<{ token: string; user: User }> {
  const res = await fetch('/api/auth/github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirectUri: githubRedirectUri() }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'GitHub login failed' }));
    throw new Error(err.error || 'GitHub login failed');
  }
  return res.json();
}
