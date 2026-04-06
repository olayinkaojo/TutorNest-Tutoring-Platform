import * as Sentry from '@sentry/react';
import LogRocket from 'logrocket';

/**
 * Custom Metrics Collector for tracking application-specific metrics
 * Sends data to both Sentry and LogRocket for comprehensive monitoring
 */

export interface CustomMetric {
  name: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp?: number;
}

export interface VideoMetrics {
  sessionId: string;
  bitrate: number;
  frameRate: number;
  latency: number;
  packetLoss: number;
  resolution: string;
  timestamp: number;
}

export interface APIMetrics {
  endpoint: string;
  method: string;
  statusCode: number;
  duration: number;
  responseSize: number;
  timestamp: number;
}

export interface EngagementMetrics {
  userId: string;
  sessionDuration: number;
  quizzesTaken: number;
  achievementsUnlocked: number;
  timestamp: number;
}

class MetricsCollector {
  private metricsBuffer: CustomMetric[] = [];
  private bufferSize = 50;
  private flushInterval = 30000; // 30 seconds

  constructor() {
    this.startFlushInterval();
  }

  /**
   * Record a custom metric
   */
  public recordMetric(metric: CustomMetric) {
    metric.timestamp = metric.timestamp || Date.now();
    this.metricsBuffer.push(metric);

    if (this.metricsBuffer.length >= this.bufferSize) {
      this.flush();
    }
  }

  /**
   * Record video conference metrics
   */
  public recordVideoMetrics(metrics: VideoMetrics) {
    this.recordMetric({
      name: 'video_conferencing',
      value: metrics.bitrate,
      unit: 'kbps',
      tags: {
        sessionId: metrics.sessionId,
        resolution: metrics.resolution,
        frameRate: String(metrics.frameRate),
        latency: String(metrics.latency),
        packetLoss: String(metrics.packetLoss),
      },
      timestamp: metrics.timestamp,
    });

    // Send video-specific metrics to Sentry
    Sentry.captureMessage('Video Metrics', 'info', {
      contexts: {
        video: {
          bitrate: metrics.bitrate,
          frameRate: metrics.frameRate,
          latency: metrics.latency,
          packetLoss: metrics.packetLoss,
          resolution: metrics.resolution,
        },
      },
    });
  }

  /**
   * Record API performance metrics
   */
  public recordAPIMetrics(metrics: APIMetrics) {
    const isError = metrics.statusCode >= 400;
    
    this.recordMetric({
      name: 'api_call',
      value: metrics.duration,
      unit: 'ms',
      tags: {
        endpoint: metrics.endpoint,
        method: metrics.method,
        statusCode: String(metrics.statusCode),
        responseSize: String(metrics.responseSize),
      },
      timestamp: metrics.timestamp,
    });

    // If error, also capture for error tracking
    if (isError) {
      Sentry.captureMessage(`API Error: ${metrics.method} ${metrics.endpoint}`, 'error', {
        contexts: {
          api: {
            endpoint: metrics.endpoint,
            method: metrics.method,
            statusCode: metrics.statusCode,
            duration: metrics.duration,
          },
        },
      });
    }
  }

  /**
   * Record user engagement metrics
   */
  public recordEngagementMetrics(metrics: EngagementMetrics) {
    this.recordMetric({
      name: 'user_engagement',
      value: metrics.sessionDuration,
      unit: 'seconds',
      tags: {
        userId: metrics.userId,
        quizzesTaken: String(metrics.quizzesTaken),
        achievementsUnlocked: String(metrics.achievementsUnlocked),
      },
      timestamp: metrics.timestamp,
    });

    // Track engagement in LogRocket
    LogRocket.captureMessage(`User Engagement: ${metrics.quizzesTaken} quizzes, ${metrics.achievementsUnlocked} achievements`);
  }

  /**
   * Record page performance metrics
   */
  public recordPagePerformance(pageName: string, metrics: PerformanceMetrics) {
    this.recordMetric({
      name: 'page_performance',
      value: metrics.loadTime,
      unit: 'ms',
      tags: {
        pageName,
        domContentLoaded: String(metrics.domContentLoaded),
        firstPaint: String(metrics.firstPaint),
        firstContentfulPaint: String(metrics.firstContentfulPaint),
      },
    });
  }

  /**
   * Record error with context
   */
  public recordError(error: Error, context?: Record<string, any>) {
    this.recordMetric({
      name: 'error_occurred',
      value: 1,
      tags: {
        errorMessage: error.message,
        errorType: error.name,
        ...context,
      },
    });

    // Also send to Sentry
    Sentry.captureException(error, {
      contexts: {
        extra: context,
      },
    });
  }

  /**
   * Record custom event
   */
  public recordEvent(eventName: string, properties?: Record<string, any>) {
    this.recordMetric({
      name: eventName,
      value: 1,
      tags: properties,
    });

    // Also track in LogRocket
    LogRocket.captureMessage(`Event: ${eventName}`);
  }

  /**
   * Flush buffered metrics to backend
   */
  public async flush() {
    if (this.metricsBuffer.length === 0) {
      return;
    }

    const batch = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      // Send to metrics endpoint
      const response = await fetch('/api/metrics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': this.getUserId() || 'anonymous',
        },
        body: JSON.stringify({
          metrics: batch,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        console.warn(`Failed to flush metrics: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to flush metrics:', error);
      // Re-add metrics to buffer on failure
      this.metricsBuffer = [...batch, ...this.metricsBuffer];
    }
  }

  /**
   * Start periodic flush of metrics
   */
  private startFlushInterval() {
    setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Get current user ID from local storage or session
   */
  private getUserId(): string | null {
    try {
      const user = localStorage.getItem('user');
      if (user) {
        const userData = JSON.parse(user);
        return userData.id;
      }
    } catch (error) {
      console.error('Failed to get user ID:', error);
    }
    return null;
  }

  /**
   * Destroy metrics collector (useful for cleanup)
   */
  public destroy() {
    this.flush();
  }
}

export interface PerformanceMetrics {
  loadTime: number;
  domContentLoaded: number;
  firstPaint: number;
  firstContentfulPaint: number;
}

// Create singleton instance
export const metricsCollector = new MetricsCollector();

/**
 * Measure and record page performance
 */
export const measurePagePerformance = (pageName: string) => {
  if (typeof window === 'undefined' || !window.performance) {
    return;
  }

  const perfData = window.performance.timing;
  const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
  const domContentLoadedTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
  const firstPaint = (performance.getEntriesByType('paint')[0] as PerformanceEntryWithStartTime)?.startTime || 0;
  const firstContentfulPaint = (performance.getEntriesByType('paint')[1] as PerformanceEntryWithStartTime)?.startTime || 0;

  metricsCollector.recordPagePerformance(pageName, {
    loadTime: pageLoadTime,
    domContentLoaded: domContentLoadedTime,
    firstPaint,
    firstContentfulPaint,
  });
};

interface PerformanceEntryWithStartTime extends PerformanceEntry {
  startTime: number;
}

export default metricsCollector;
