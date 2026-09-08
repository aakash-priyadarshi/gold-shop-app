import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Support tab credential isolation', () => {
  const originalFetch = window.fetch;
  const makeStorage = () => {
    const values = new Map<string, string>();
    return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => void values.set(key, value), removeItem: (key: string) => void values.delete(key), clear: () => void values.clear() };
  };
  beforeEach(() => { vi.resetModules(); const local = makeStorage(); const session = makeStorage(); Object.defineProperty(window, 'localStorage', { configurable: true, value: local }); Object.defineProperty(window, 'sessionStorage', { configurable: true, value: session }); Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: local }); Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: session }); window.fetch = originalFetch; });
  afterEach(() => { vi.restoreAllMocks(); window.fetch = originalFetch; });
  it('preserves admin credentials and isolates preferences in session storage', async () => {
    const session = await import('./support-session');
    window.localStorage.setItem('token', 'admin-token');
    window.localStorage.setItem('refreshToken', 'admin-refresh');
    window.localStorage.setItem('gold-shop-preferences', 'admin-preferences');
    session.storeSupportToken(`osa_${'a'.repeat(64)}`);
    session.getPreferenceStorage().setItem('gold-shop-preferences', 'seller-preferences');
    expect(window.localStorage.getItem('token')).toBe('admin-token');
    expect(window.localStorage.getItem('refreshToken')).toBe('admin-refresh');
    expect(window.localStorage.getItem('gold-shop-preferences')).toBe('admin-preferences');
    expect(window.sessionStorage.getItem('gold-shop-preferences')).toBe('seller-preferences');
  });
  it('keeps in-flight requests in support mode during exit', async () => {
    const session = await import('./support-session');
    vi.spyOn(console, 'error').mockImplementation(() => undefined); // jsdom has no navigation.
    const token = `osa_${'b'.repeat(64)}`;
    window.localStorage.setItem('token', 'admin-token');
    session.storeSupportToken(token);
    session.exitSupportSession();
    expect(window.sessionStorage.getItem('orivraa-support-session')).toBeNull();
    expect(session.getSupportToken()).toBe(token);
    expect(window.localStorage.getItem('token')).toBe('admin-token');
  });
  it('rejects ordinary credentials as support credentials', async () => {
    const session = await import('./support-session');
    expect(() => session.storeSupportToken('admin-token')).toThrow();
    expect(session.getSupportToken()).toBeNull();
  });
});
