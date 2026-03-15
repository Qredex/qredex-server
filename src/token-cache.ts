import type { CachedAccessToken, QredexTokenCache } from "./types";

export class MemoryTokenCache implements QredexTokenCache {
  private token: CachedAccessToken | null = null;

  async get(): Promise<CachedAccessToken | null> {
    return this.token;
  }

  async set(token: CachedAccessToken): Promise<void> {
    this.token = token;
  }

  async clear(): Promise<void> {
    this.token = null;
  }
}
