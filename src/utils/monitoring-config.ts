/**
 * Monitoring & Alerting Configuration
 * Centralizes all monitoring settings and alert thresholds
 */

export interface MonitoringConfig {
  // Error Rate Thresholds
  errorRateThreshold: number; // % of requests that fail
  errorRateAlertLevel: 'warning' | 'error'; // Alert level when exceeded

  // Response Time Thresholds (in ms)
  responseTimeWarning: number; // P95 response time threshold for warning
  responseTimeError: number; // P95 response time threshold for error

  // API Performance Thresholds
  apiResponseTimeThreshold: number; // Max acceptable API response time
  apiErrorRateThreshold: number; // Max acceptable API error rate

  // Video Conference Thresholds
  videoBitrateThreshold: number; // Minimum acceptable bitrate (Kbps)
  videoLatencyThreshold: number; // Maximum acceptable latency (ms)
  videoPacketLossThreshold: number; // Maximum acceptable packet loss (%)

  // Resource Usage Thresholds
  memoryUsageThreshold: number; // % of available memory
  cpuUsageThreshold: number; // % of CPU usage
  diskUsageThreshold: number; // % of disk space

  // Database Thresholds
  databaseConnectionFailureThreshold: number; // Number of consecutive failures
  databaseQueryTimeThreshold: number; // Max query time (ms)

  // Alert Settings
  alerts: {
    enableEmailNotifications: boolean;
    enableSlackNotifications: boolean;
    enablePagerDuty: boolean;
    escalationTimeInMinutes: number; // Time before escalating alert
  };

  // Sampling & Data Retention
  performanceSampleRate: number; // % of transactions to sample (0-1)
  replaySampleRate: number; // % of sessions to record
  errorSampleRate: number; // % of errors to capture (0-1)
  dataRetentionDays: number; // How long to retain logs
}

// Production Configuration
export const productionConfig: MonitoringConfig = {
  // Error Rate: Alert if > 5% of requests fail
  errorRateThreshold: 5,
  errorRateAlertLevel: 'error',

  // Response Time: Warn if P95 > 2s, Error if > 5s
  responseTimeWarning: 2000,
  responseTimeError: 5000,

  // API Performance: Warn if API takes > 1s
  apiResponseTimeThreshold: 1000,
  apiErrorRateThreshold: 1, // Alert if > 1% API errors

  // Video: Warn if bitrate < 500Kbps, latency > 200ms, packet loss > 2%
  videoBitrateThreshold: 500,
  videoLatencyThreshold: 200,
  videoPacketLossThreshold: 2,

  // Resource Usage: Warn if memory > 85%, CPU > 80%
  memoryUsageThreshold: 85,
  cpuUsageThreshold: 80,
  diskUsageThreshold: 90,

  // Database: Warn if > 3 consecutive failures, queries > 500ms
  databaseConnectionFailureThreshold: 3,
  databaseQueryTimeThreshold: 500,

  // Alerts: All enabled with 5 minute escalation
  alerts: {
    enableEmailNotifications: true,
    enableSlackNotifications: true,
    enablePagerDuty: true,
    escalationTimeInMinutes: 5,
  },

  // Sampling: 10% performance, 10% replay, 100% errors, 30 day retention
  performanceSampleRate: 0.1,
  replaySampleRate: 0.1,
  errorSampleRate: 1.0,
  dataRetentionDays: 30,
};

// Staging Configuration
export const stagingConfig: MonitoringConfig = {
  errorRateThreshold: 10, // Higher threshold in staging
  errorRateAlertLevel: 'warning',

  responseTimeWarning: 3000,
  responseTimeError: 10000,

  apiResponseTimeThreshold: 2000,
  apiErrorRateThreshold: 5, // Higher threshold in staging

  videoBitrateThreshold: 300, // Lower threshold for staging
  videoLatencyThreshold: 300,
  videoPacketLossThreshold: 5,

  memoryUsageThreshold: 90,
  cpuUsageThreshold: 85,
  diskUsageThreshold: 95,

  databaseConnectionFailureThreshold: 5,
  databaseQueryTimeThreshold: 1000,

  alerts: {
    enableEmailNotifications: true,
    enableSlackNotifications: true,
    enablePagerDuty: false,
    escalationTimeInMinutes: 10,
  },

  performanceSampleRate: 0.5, // Higher sampling in staging
  replaySampleRate: 0.3,
  errorSampleRate: 1.0,
  dataRetentionDays: 14,
};

// Development Configuration
export const developmentConfig: MonitoringConfig = {
  errorRateThreshold: 50, // Very lenient in dev
  errorRateAlertLevel: 'warning',

  responseTimeWarning: 5000,
  responseTimeError: 30000,

  apiResponseTimeThreshold: 5000,
  apiErrorRateThreshold: 20,

  videoBitrateThreshold: 100,
  videoLatencyThreshold: 500,
  videoPacketLossThreshold: 10,

  memoryUsageThreshold: 95,
  cpuUsageThreshold: 95,
  diskUsageThreshold: 98,

  databaseConnectionFailureThreshold: 20,
  databaseQueryTimeThreshold: 5000,

  alerts: {
    enableEmailNotifications: false,
    enableSlackNotifications: false,
    enablePagerDuty: false,
    escalationTimeInMinutes: 60,
  },

  performanceSampleRate: 1.0, // Track everything in dev
  replaySampleRate: 1.0,
  errorSampleRate: 1.0,
  dataRetentionDays: 7,
};

/**
 * Get configuration based on environment
 */
export const getMonitoringConfig = (): MonitoringConfig => {
  const env = import.meta.env.MODE || 'development';

  switch (env) {
    case 'production':
      return productionConfig;
    case 'staging':
      return stagingConfig;
    default:
      return developmentConfig;
  }
};

/**
 * Alert Rules - Define what triggers alerts
 */
export interface AlertRule {
  id: string;
  name: string;
  description: string;
  metric: string;
  threshold: number;
  operator: '>' | '<' | '==' | '!=';
  duration: number; // Duration threshold must be exceeded (ms)
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'slack' | 'pagerduty' | 'webhook';
  target: string;
  message?: string;
}

/**
 * Default Alert Rules
 */
export const defaultAlertRules: AlertRule[] = [
  {
    id: 'high-error-rate',
    name: 'High Error Rate',
    description: 'Alert when error rate exceeds threshold',
    metric: 'error_rate',
    threshold: 5,
    operator: '>',
    duration: 300000, // 5 minutes
    severity: 'critical',
    enabled: true,
    actions: [
      { type: 'email', target: 'devops@tutornest.com' },
      { type: 'slack', target: '#alerts' },
      { type: 'pagerduty', target: 'on-call' },
    ],
  },

  {
    id: 'slow-api-response',
    name: 'Slow API Response Time',
    description: 'Alert when API response time is slow',
    metric: 'api_response_time_p95',
    threshold: 2000,
    operator: '>',
    duration: 300000,
    severity: 'warning',
    enabled: true,
    actions: [
      { type: 'slack', target: '#alerts' },
    ],
  },

  {
    id: 'video-quality-degradation',
    name: 'Video Quality Degradation',
    description: 'Alert when video bitrate drops significantly',
    metric: 'video_bitrate',
    threshold: 500,
    operator: '<',
    duration: 60000, // 1 minute
    severity: 'warning',
    enabled: true,
    actions: [
      { type: 'slack', target: '#video-alerts' },
    ],
  },

  {
    id: 'high-latency',
    name: 'High Latency',
    description: 'Alert when latency exceeds threshold',
    metric: 'network_latency',
    threshold: 200,
    operator: '>',
    duration: 120000, // 2 minutes
    severity: 'warning',
    enabled: true,
    actions: [
      { type: 'slack', target: '#alerts' },
    ],
  },

  {
    id: 'database-unavailable',
    name: 'Database Unavailable',
    description: 'Alert when database is unreachable',
    metric: 'db_connection_failed',
    threshold: 3,
    operator: '>=',
    duration: 10000, // 10 seconds
    severity: 'critical',
    enabled: true,
    actions: [
      { type: 'email', target: 'devops@tutornest.com' },
      { type: 'slack', target: '#database-alerts' },
      { type: 'pagerduty', target: 'on-call' },
    ],
  },

  {
    id: 'memory-high',
    name: 'High Memory Usage',
    description: 'Alert when memory usage exceeds threshold',
    metric: 'memory_usage_percent',
    threshold: 85,
    operator: '>',
    duration: 300000,
    severity: 'warning',
    enabled: true,
    actions: [
      { type: 'slack', target: '#infrastructure' },
    ],
  },
];

export default {
  productionConfig,
  stagingConfig,
  developmentConfig,
  getMonitoringConfig,
  defaultAlertRules,
};
