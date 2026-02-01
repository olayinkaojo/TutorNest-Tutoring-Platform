/**
 * Performance Optimization Utilities for TutorNest
 * 
 * This module provides utilities for:
 * - Debouncing and throttling
 * - Caching
 * - Lazy loading
 * - Optimistic UI updates
 */

// ============================================
// DEBOUNCE
// ============================================

/**
 * Debounce function - delays execution until after wait time has passed
 * since last call. Perfect for search inputs, resize handlers, etc.
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// ============================================
// THROTTLE
// ============================================

/**
 * Throttle function - ensures function is called at most once per wait period
 * Perfect for scroll handlers, mouse movement tracking, etc.
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  let lastTime: number;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      lastTime = Date.now();
      inThrottle = true;

      setTimeout(() => {
        inThrottle = false;
      }, wait);
    }
  };
}

// ============================================
// SIMPLE CACHE
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class SimpleCache<T = any> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private ttl: number; // Time to live in milliseconds

  constructor(ttl: number = 5 * 60 * 1000) { // Default 5 minutes
    this.ttl = ttl;
  }

  set(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if cache entry has expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  // Clean up expired entries
  prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

// Export singleton instances for common use cases
export const apiCache = new SimpleCache(5 * 60 * 1000); // 5 minutes
export const userCache = new SimpleCache(10 * 60 * 1000); // 10 minutes
export const staticCache = new SimpleCache(60 * 60 * 1000); // 1 hour

// ============================================
// CACHED FETCH
// ============================================

/**
 * Fetch with automatic caching
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit,
  cacheDuration: number = 5 * 60 * 1000
): Promise<T> {
  const cacheKey = `${url}-${JSON.stringify(options)}`;
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    return cached as T;
  }

  // Fetch if not cached
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  
  const data = await response.json();
  
  // Store in cache
  apiCache.set(cacheKey, data);
  
  return data;
}

// ============================================
// OPTIMISTIC UPDATE
// ============================================

/**
 * Optimistic update helper - updates UI immediately, then syncs with server
 */
export async function optimisticUpdate<T>(
  optimisticData: T,
  updateFn: () => Promise<T>,
  onSuccess?: (data: T) => void,
  onError?: (error: Error, rollbackData: T) => void
): Promise<T> {
  try {
    // Return optimistic data immediately
    if (onSuccess) {
      onSuccess(optimisticData);
    }

    // Perform actual update
    const result = await updateFn();
    
    // Update with real data if different
    if (onSuccess && result !== optimisticData) {
      onSuccess(result);
    }

    return result;
  } catch (error) {
    // Rollback on error
    if (onError) {
      onError(error as Error, optimisticData);
    }
    throw error;
  }
}

// ============================================
// LAZY IMAGE LOADING
// ============================================

/**
 * Intersection Observer for lazy loading
 */
export function createLazyLoader(
  callback: (element: Element) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        callback(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, options || { rootMargin: '50px' });

  return observer;
}

// ============================================
// BATCH REQUESTS
// ============================================

/**
 * Batch multiple requests into a single call
 */
class RequestBatcher {
  private queue: Array<{
    key: string;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private timeout: ReturnType<typeof setTimeout> | null = null;
  private batchFn: (keys: string[]) => Promise<any[]>;
  private wait: number;

  constructor(batchFn: (keys: string[]) => Promise<any[]>, wait: number = 50) {
    this.batchFn = batchFn;
    this.wait = wait;
  }

  request(key: string): Promise<any> {
    return new Promise((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (this.timeout) {
        clearTimeout(this.timeout);
      }

      this.timeout = setTimeout(() => {
        this.flush();
      }, this.wait);
    });
  }

  private async flush() {
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];

    try {
      const keys = batch.map(item => item.key);
      const results = await this.batchFn(keys);

      batch.forEach((item, index) => {
        item.resolve(results[index]);
      });
    } catch (error) {
      batch.forEach(item => {
        item.reject(error);
      });
    }
  }
}

/**
 * Create a batched version of an API call
 */
export function createBatcher(
  batchFn: (keys: string[]) => Promise<any[]>,
  wait?: number
): (key: string) => Promise<any> {
  const batcher = new RequestBatcher(batchFn, wait);
  return (key: string) => batcher.request(key);
}

// ============================================
// RETRY LOGIC
// ============================================

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number;
    delay?: number;
    backoff?: number;
    onRetry?: (attempt: number, error: Error) => void;
  } = {}
): Promise<T> {
  const {
    retries = 3,
    delay = 1000,
    backoff = 2,
    onRetry
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt < retries) {
        const waitTime = delay * Math.pow(backoff, attempt);
        
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }

        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError!;
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

/**
 * Safe localStorage operations with error handling
 */
export const storage = {
  get<T>(key: string, defaultValue?: T): T | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch (error) {
      console.error(`Error reading from localStorage: ${key}`, error);
      return defaultValue || null;
    }
  },

  set(key: string, value: any): boolean {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`Error writing to localStorage: ${key}`, error);
      return false;
    }
  },

  remove(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Error removing from localStorage: ${key}`, error);
      return false;
    }
  },

  clear(): boolean {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing localStorage', error);
      return false;
    }
  }
};

// ============================================
// MEMOIZATION
// ============================================

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  getCacheKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = getCacheKey 
      ? getCacheKey(...args) 
      : JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// ============================================
// PRELOAD RESOURCES
// ============================================

/**
 * Preload images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map(url => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
    })
  );
}

/**
 * Preload a module
 */
export function preloadModule(modulePath: string): void {
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = modulePath;
  document.head.appendChild(link);
}
