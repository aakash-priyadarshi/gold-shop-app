import { Logger } from '@nestjs/common';

const logger = new Logger('UrlValidator');

const BLOCKED_IP_RANGES = [
  /^127\./,           // localhost
  /^10\./,            // private
  /^192\.168\./,      // private
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // private
  /^169\.254\./,      // link-local (AWS metadata)
  /^0\./,             // current network
  /^::1$/,            // localhost IPv6
  /^fc00:/i,          // IPv6 private
  /^fe80:/i,          // IPv6 link-local
];

export function isSafeUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') {
      return false;
    }
    const hostname = url.hostname;
    for (const range of BLOCKED_IP_RANGES) {
      if (range.test(hostname)) {
        logger.warn(`Blocked SSRF attempt to internal URL: ${urlStr}`);
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}
