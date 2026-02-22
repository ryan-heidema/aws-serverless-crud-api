import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';

const ENV = process.env.ENV_NAME ?? process.env.NODE_ENV ?? 'unknown';

/**
 * Shared Metrics instance for business metrics
 */
export const metrics = new Metrics({
  namespace: 'ItemsService',
  serviceName: 'items-api',
  defaultDimensions: { Environment: ENV },
});

export type ItemMetricOperation = 'created' | 'updated' | 'deleted';

const METRIC_NAMES: Record<ItemMetricOperation, string> = {
  created: 'ItemsCreated',
  updated: 'ItemsUpdated',
  deleted: 'ItemsDeleted',
};

/**
 * Record one business metric (ItemsCreated / ItemsUpdated / ItemsDeleted) and flush to CloudWatch EMF
 * Call only after a successful operation—not on validation failures or 4xx errors
 */
export function recordItemMetric(operation: ItemMetricOperation): void {
  metrics.addMetric(METRIC_NAMES[operation], MetricUnit.Count, 1);
  metrics.publishStoredMetrics();
}
