const CONFIGURED_PUBLIC_APP_BASE_URL = process.env.NEXT_PUBLIC_APP_BASE_URL?.trim();

export function getPublicAppBaseUrl() {
  if (CONFIGURED_PUBLIC_APP_BASE_URL) {
    return CONFIGURED_PUBLIC_APP_BASE_URL.replace(/\/+$/, '');
  }

  if (typeof window !== 'undefined') {
    return window.location.origin.replace(/\/+$/, '');
  }

  return '';
}

export function buildPublicRsvpUrl(token: string) {
  const baseUrl = getPublicAppBaseUrl();
  return baseUrl ? `${baseUrl}/rsvp/${token}` : `/rsvp/${token}`;
}
