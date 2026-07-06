import { isSafeUrl } from './url-validator';

describe('URL Validator (SSRF Protection)', () => {
  describe('isSafeUrl', () => {
    it('should allow standard HTTPS URLs', () => {
      expect(isSafeUrl('https://example.com/webhook')).toBe(true);
      expect(isSafeUrl('https://api.orivraa.com/endpoint')).toBe(true);
    });

    it('should allow standard HTTP URLs', () => {
      expect(isSafeUrl('http://example.com/webhook')).toBe(true);
    });

    it('should block localhost (127.x.x.x)', () => {
      expect(isSafeUrl('http://127.0.0.1:3000/admin')).toBe(false);
      expect(isSafeUrl('http://127.0.0.1/')).toBe(false);
    });

    it('should block private IP ranges (10.x)', () => {
      expect(isSafeUrl('http://10.0.0.1/internal')).toBe(false);
      expect(isSafeUrl('http://10.168.1.1/api')).toBe(false);
    });

    it('should block private IP ranges (192.168.x)', () => {
      expect(isSafeUrl('http://192.168.1.1/router')).toBe(false);
      expect(isSafeUrl('http://192.168.0.100/config')).toBe(false);
    });

    it('should block private IP ranges (172.16-31.x)', () => {
      expect(isSafeUrl('http://172.16.0.1/internal')).toBe(false);
      expect(isSafeUrl('http://172.31.255.255/internal')).toBe(false);
    });

    it('should block link-local addresses (169.254.x — AWS metadata)', () => {
      expect(isSafeUrl('http://169.254.169.254/latest/meta-data/')).toBe(false);
    });

    it('should block current network (0.x)', () => {
      expect(isSafeUrl('http://0.0.0.0/')).toBe(false);
    });

    it('should block non-http protocols', () => {
      expect(isSafeUrl('ftp://example.com/file')).toBe(false);
      expect(isSafeUrl('file:///etc/passwd')).toBe(false);
      expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    });

    it('should block invalid URLs', () => {
      expect(isSafeUrl('not-a-url')).toBe(false);
      expect(isSafeUrl('')).toBe(false);
      expect(isSafeUrl('   ')).toBe(false);
    });

    it('should allow public domain names', () => {
      expect(isSafeUrl('https://hooks.slack.com/services/123')).toBe(true);
      expect(isSafeUrl('https://api.stripe.com/webhooks')).toBe(true);
    });
  });
});
