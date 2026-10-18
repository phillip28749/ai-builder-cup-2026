type OriginSettings = {
  publicOrigin?: string;
  firebaseWebConfig?: string;
  cloudProject?: string;
};

function parseOrigin(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return undefined;
    return url.origin;
  } catch {
    return undefined;
  }
}

/** Trust explicit app origins, never arbitrary forwarded-host headers. */
export function allowedRequestOrigin(
  origin: string,
  host: string | undefined,
  protocol: string,
  settings: OriginSettings,
): boolean {
  const candidate = parseOrigin(origin);
  if (!candidate || candidate !== origin) return false;
  const allowed = new Set<string>();
  for (const value of [
    settings.publicOrigin,
    host ? `${protocol}://${host}` : undefined,
  ]) {
    const parsed = value && parseOrigin(value);
    if (parsed) allowed.add(parsed);
  }
  let project = settings.cloudProject;
  try {
    project =
      JSON.parse(settings.firebaseWebConfig || "{}").projectId || project;
  } catch {
    /* An invalid configuration must not expand the allowlist. */
  }
  if (project && /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project)) {
    allowed.add(`https://${project}.web.app`);
    allowed.add(`https://${project}.firebaseapp.com`);
  }
  return allowed.has(candidate);
}
