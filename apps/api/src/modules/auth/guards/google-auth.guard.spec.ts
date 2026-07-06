/**
 * Security tests for OAuth state HMAC signing and verification.
 * Verifies that the OAuth state parameter is tamper-proof.
 */
import * as crypto from 'crypto';

describe('OAuth State HMAC Signing', () => {
  const JWT_SECRET = 'test-jwt-secret-for-oauth';

  function signState(data: Record<string, string>): string {
    const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');
    const hmac = crypto.createHmac('sha256', JWT_SECRET).update(encodedData).digest('hex');
    return encodedData + '.' + hmac;
  }

  function verifyState(state: string): Record<string, string> | null {
    const lastDotIndex = state.lastIndexOf('.');
    if (lastDotIndex === -1) return null;
    const encodedData = state.substring(0, lastDotIndex);
    const signature = state.substring(lastDotIndex + 1);
    const expectedHmac = crypto.createHmac('sha256', JWT_SECRET).update(encodedData).digest('hex');
    if (signature !== expectedHmac) return null;
    try {
      return JSON.parse(Buffer.from(encodedData, 'base64').toString());
    } catch {
      return null;
    }
  }

  it('should sign and verify a valid state', () => {
    const data = { role: 'CUSTOMER', mode: 'login', ts: '1234567890' };
    const state = signState(data);
    const verified = verifyState(state);
    expect(verified).toEqual(data);
  });

  it('should reject a tampered role parameter', () => {
    const data = { role: 'CUSTOMER', mode: 'login', ts: '1234567890' };
    const state = signState(data);
    // Tamper with the role by modifying the base64 data
    const [encodedData, signature] = state.split('.');
    const decoded = JSON.parse(Buffer.from(encodedData, 'base64').toString());
    decoded.role = 'SHOPKEEPER'; // Attacker tries to escalate
    const tamperedEncoded = Buffer.from(JSON.stringify(decoded)).toString('base64');
    const tamperedState = tamperedEncoded + '.' + signature;
    const verified = verifyState(tamperedState);
    expect(verified).toBeNull();
  });

  it('should reject a state with wrong HMAC signature', () => {
    const data = { role: 'CUSTOMER', mode: 'login', ts: '1234567890' };
    const state = signState(data);
    // Replace the signature with a fake one
    const tamperedState = state.split('.')[0] + '.fakesignature123';
    const verified = verifyState(tamperedState);
    expect(verified).toBeNull();
  });

  it('should reject a state signed with a different secret', () => {
    const data = { role: 'CUSTOMER', mode: 'login', ts: '1234567890' };
    const wrongSecretState = (() => {
      const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');
      const hmac = crypto.createHmac('sha256', 'wrong-secret').update(encodedData).digest('hex');
      return encodedData + '.' + hmac;
    })();
    const verified = verifyState(wrongSecretState);
    expect(verified).toBeNull();
  });

  it('should reject malformed state (no dot)', () => {
    const verified = verifyState('justsomedata');
    expect(verified).toBeNull();
  });

  it('should reject empty state', () => {
    const verified = verifyState('');
    expect(verified).toBeNull();
  });

  it('should preserve desktop_port and rememberMe through signing', () => {
    const data = {
      role: 'CUSTOMER',
      mode: 'login',
      ts: '1234567890',
      desktop_port: '3001',
      rememberMe: 'true',
    };
    const state = signState(data);
    const verified = verifyState(state);
    expect(verified).toEqual(data);
    expect(verified?.desktop_port).toBe('3001');
    expect(verified?.rememberMe).toBe('true');
  });
});
