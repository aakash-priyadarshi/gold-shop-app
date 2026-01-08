/**
 * Robust HTTP Client Service
 * Provides a shared HTTP wrapper with:
 * - Configurable timeouts
 * - Exponential backoff retries
 * - Transient error handling (ENOTFOUND, ECONNRESET, ETIMEDOUT, 5xx)
 * - Concise logging
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Transient errors that should be retried
const TRANSIENT_ERRORS = [
  'ENOTFOUND',
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'EHOSTUNREACH',
  'ENETUNREACH',
  'EAI_AGAIN',
];

// HTTP status codes to retry
const RETRY_STATUS_CODES = [408, 429, 500, 502, 503, 504];

export interface HttpClientOptions {
  timeout?: number;
  maxRetries?: number;
  baseDelay?: number;
  headers?: Record<string, string>;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  attempts: number;
}

@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly defaultTimeout: number;
  private readonly defaultMaxRetries: number;
  private readonly defaultBaseDelay: number;

  constructor(private readonly configService: ConfigService) {
    this.defaultTimeout = parseInt(
      this.configService.get<string>('HTTP_CLIENT_TIMEOUT') || '10000',
      10,
    );
    this.defaultMaxRetries = parseInt(
      this.configService.get<string>('HTTP_CLIENT_MAX_RETRIES') || '3',
      10,
    );
    this.defaultBaseDelay = parseInt(
      this.configService.get<string>('HTTP_CLIENT_BASE_DELAY') || '500',
      10,
    );

    this.axiosInstance = axios.create({
      timeout: this.defaultTimeout,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'GoldShop-API/1.0',
      },
    });
  }

  /**
   * Make a GET request with retry logic
   */
  async get<T = any>(url: string, options?: HttpClientOptions): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'GET', url, ...options });
  }

  /**
   * Make a POST request with retry logic
   */
  async post<T = any>(
    url: string,
    data?: any,
    options?: HttpClientOptions,
  ): Promise<HttpResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, ...options });
  }

  /**
   * Core request method with retry logic
   */
  private async request<T = any>(config: AxiosRequestConfig & HttpClientOptions): Promise<HttpResponse<T>> {
    const maxRetries = config.maxRetries ?? this.defaultMaxRetries;
    const baseDelay = config.baseDelay ?? this.defaultBaseDelay;
    const timeout = config.timeout ?? this.defaultTimeout;

    let lastError: Error | null = null;
    let attempt = 0;

    while (attempt < maxRetries) {
      attempt++;

      try {
        const response: AxiosResponse<T> = await this.axiosInstance.request({
          ...config,
          timeout,
        });

        if (attempt > 1) {
          this.logger.log(`[${config.method}] ${config.url} succeeded on attempt ${attempt}`);
        }

        return {
          data: response.data,
          status: response.status,
          headers: response.headers as Record<string, string>,
          attempts: attempt,
        };
      } catch (error) {
        lastError = error as Error;

        if (!this.isRetryable(error as AxiosError)) {
          this.logger.warn(
            `[${config.method}] ${config.url} failed (non-retryable): ${this.getErrorMessage(error as AxiosError)}`,
          );
          throw error;
        }

        if (attempt < maxRetries) {
          // Exponential backoff: 500ms, 1000ms, 2000ms
          const delay = baseDelay * Math.pow(2, attempt - 1);
          this.logger.warn(
            `[${config.method}] ${config.url} attempt ${attempt}/${maxRetries} failed: ${this.getErrorMessage(error as AxiosError)}. Retrying in ${delay}ms...`,
          );
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    this.logger.error(
      `[${config.method}] ${config.url} failed after ${maxRetries} attempts: ${this.getErrorMessage(lastError as AxiosError)}`,
    );
    throw lastError;
  }

  /**
   * Check if an error is retryable
   */
  private isRetryable(error: AxiosError): boolean {
    // Network errors (ENOTFOUND, ECONNRESET, etc.)
    if (error.code && TRANSIENT_ERRORS.includes(error.code)) {
      return true;
    }

    // HTTP status code errors (5xx, 429, 408)
    if (error.response && RETRY_STATUS_CODES.includes(error.response.status)) {
      return true;
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return true;
    }

    return false;
  }

  /**
   * Get a user-friendly error message
   */
  private getErrorMessage(error: AxiosError): string {
    if (error.code) {
      return `${error.code}: ${error.message}`;
    }
    if (error.response) {
      return `HTTP ${error.response.status}: ${error.response.statusText}`;
    }
    return error.message || 'Unknown error';
  }

  /**
   * Sleep helper for backoff delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
