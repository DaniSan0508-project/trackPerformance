const DEFAULT_DOMAIN = import.meta.env.VITE_DEFAULT_DOMAIN?.trim() || '';

const isIpv4Address = (hostname: string) => /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);

const isLocalHostname = (hostname: string) => {
  const normalizedHostname = hostname.toLowerCase().trim();

  return (
    normalizedHostname === 'localhost' ||
    normalizedHostname === '127.0.0.1' ||
    normalizedHostname === '::1' ||
    isIpv4Address(normalizedHostname)
  );
};

export const resolvePortalDomain = (hostname: string = window.location.hostname): string | null => {
  const normalizedHostname = hostname.toLowerCase().trim();

  if (!normalizedHostname) {
    return DEFAULT_DOMAIN || null;
  }

  if (isLocalHostname(normalizedHostname)) {
    return DEFAULT_DOMAIN || null;
  }

  const parts = normalizedHostname.split('.').filter(Boolean);

  if (parts.length >= 3) {
    return parts[0];
  }

  return DEFAULT_DOMAIN || null;
};
