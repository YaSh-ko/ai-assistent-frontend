export function getApiKey(): string | null {
  try {
    if (globalThis.window !== undefined) {
      return globalThis.localStorage.getItem("lg:chat:apiKey") ?? null;
    }
    return null;
  } catch {
    // no-op
  }

  return null;
}
