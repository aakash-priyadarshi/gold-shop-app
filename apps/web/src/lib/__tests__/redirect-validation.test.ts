import { isSafeRedirectUrl, sanitizeRedirectUrl } from '../redirect-validation';

describe('Redirect URL Validation (Open Redirect Prevention)', () => {
  describe('isSafeRedirectUrl', () => {
    it('should allow internal paths starting with /', () => {
      expect(isSafeRedirectUrl('/dashboard')).toBe(true);
      expect(isSafeRedirectUrl('/shops/123')).toBe(true);
      expect(isSafeRedirectUrl('/auth/login')).toBe(true);
    });

    it('should block protocol-relative URLs (//evil.com)', () => {
      expect(isSafeRedirectUrl('//evil.com')).toBe(false);
      expect(isSafeRedirectUrl('//evil.com/path')).toBe(false);
    });

    it('should block absolute URLs', () => {
      expect(isSafeRedirectUrl('https://evil.com')).toBe(false);
      expect(isSafeRedirectUrl('http://evil.com')).toBe(false);
    });

    it('should block javascript: URLs', () => {
      expect(isSafeRedirectUrl('javascript:alert(1)')).toBe(false);
    });

    it('should block data: URLs', () => {
      expect(isSafeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    });

    it('should block empty or null values', () => {
      expect(isSafeRedirectUrl('')).toBe(false);
      expect(isSafeRedirectUrl(null as any)).toBe(false);
      expect(isSafeRedirectUrl(undefined as any)).toBe(false);
    });

    it('should allow paths with query strings', () => {
      expect(isSafeRedirectUrl('/dashboard?tab=settings')).toBe(true);
      expect(isSafeRedirectUrl('/shops?id=123&sort=name')).toBe(true);
    });

    it('should allow paths with fragments', () => {
      expect(isSafeRedirectUrl('/dashboard#section')).toBe(true);
    });

    it('should block scheme-bearing or whitespace-padded paths', () => {
      expect(isSafeRedirectUrl('/javascript:alert(1)')).toBe(false);
      expect(isSafeRedirectUrl('/\tevil.com')).toBe(false);
      expect(isSafeRedirectUrl('/\\evil.com')).toBe(false);
      expect(isSafeRedirectUrl('/dashboard?next=https://evil.com')).toBe(false);
    });
  });

  describe('sanitizeRedirectUrl', () => {
    it('should return the URL if safe', () => {
      expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('/shops/123')).toBe('/shops/123');
    });

    it('should return fallback if URL is unsafe', () => {
      expect(sanitizeRedirectUrl('//evil.com', '/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('https://evil.com', '/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl('javascript:alert(1)', '/dashboard')).toBe('/dashboard');
    });

    it('should return fallback if URL is empty or null', () => {
      expect(sanitizeRedirectUrl('', '/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl(null, '/dashboard')).toBe('/dashboard');
      expect(sanitizeRedirectUrl(undefined, '/dashboard')).toBe('/dashboard');
    });

    it('should use default fallback (/) if none specified', () => {
      expect(sanitizeRedirectUrl('//evil.com')).toBe('/');
      expect(sanitizeRedirectUrl('')).toBe('/');
    });
  });
});
