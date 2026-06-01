import { AppRequestError } from './errors';

type ApiRequestOptions = RequestInit & {
  idToken?: string;
  timeoutMs?: number;
};

function buildHeaders(initHeaders?: HeadersInit, idToken?: string) {
  const headers = new Headers(initHeaders);
  if (idToken) {
    headers.set('Authorization', `Bearer ${idToken}`);
  }
  return headers;
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { idToken, timeoutMs = 15000, headers: initHeaders, ...init } = options;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(path, {
      ...init,
      headers: buildHeaders(initHeaders, idToken),
      signal: controller.signal,
    });

    const text = await res.text();
    let data: unknown = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      throw new AppRequestError({
        message: res.ok ? 'Backend returned an invalid response.' : `Backend returned ${res.status}.`,
        status: res.ok ? 502 : res.status,
      });
    }

    if (!res.ok) {
      const errorMessage = (data as { error?: string; message?: string })?.error ||
        (data as { error?: string; message?: string })?.message ||
        `Request failed (${res.status}).`;
      throw new AppRequestError({
        message: errorMessage,
        status: res.status,
        recoverable: res.status >= 500 || res.status === 408 || res.status === 429,
      });
    }

    return data as T;
  } catch (error) {
    if (error instanceof AppRequestError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new AppRequestError({
        message: 'The request timed out. Please try again in a moment.',
        code: 'timeout',
        status: 408,
      });
    }
    throw new AppRequestError({
      message: error instanceof Error ? error.message : 'Network request failed.',
      code: 'network',
    });
  } finally {
    clearTimeout(timeout);
  }
}
