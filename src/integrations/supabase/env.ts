export function normalizeEnvironmentValue(value: string | undefined): string | undefined {
  if (!value) return undefined;

  return value
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .find(Boolean);
}
