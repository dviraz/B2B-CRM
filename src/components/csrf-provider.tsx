'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';

interface CsrfContextType {
  token: string | null;
  refreshToken: () => void;
}

const CsrfContext = createContext<CsrfContextType>({
  token: null,
  refreshToken: () => {},
});

/**
 * Generate a CSRF token
 */
function generateCsrfToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  const timestamp = Date.now().toString(36);
  return `${timestamp}.${token}`;
}

/**
 * Set the CSRF token as a cookie
 */
function setCsrfCookie(token: string): void {
  const maxAge = 60 * 60; // 1 hour
  document.cookie = `csrf_token=${token}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

/**
 * Get CSRF token from cookie
 */
function getCsrfCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]*)/);
  return match ? match[1] : null;
}

export function CsrfProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const refreshToken = useCallback(() => {
    const newToken = generateCsrfToken();
    setCsrfCookie(newToken);
    setToken(newToken);
  }, []);

  useEffect(() => {
    // Check for existing token or generate new one
    let existingToken = getCsrfCookie();

    if (!existingToken) {
      existingToken = generateCsrfToken();
      setCsrfCookie(existingToken);
    }

    setToken(existingToken);

    // Refresh token periodically (every 30 minutes)
    const interval = setInterval(() => {
      refreshToken();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refreshToken]);

  return (
    <CsrfContext.Provider value={{ token, refreshToken }}>
      {children}
    </CsrfContext.Provider>
  );
}

export function useCsrf() {
  return useContext(CsrfContext);
}

/**
 * Hook to create fetch options with CSRF token
 */
export function useCsrfFetch() {
  const { token } = useCsrf();

  const csrfFetch = useCallback(
    async (url: string, options: RequestInit = {}): Promise<Response> => {
      const headers = new Headers(options.headers);

      if (token) {
        headers.set('x-csrf-token', token);
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    },
    [token]
  );

  return csrfFetch;
}
