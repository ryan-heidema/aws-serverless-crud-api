import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ItemsApiDashboardProps {
  envName: string;
  httpApi: apigatewayv2.IHttpApi;
  functions: Record<string, lambda.IFunction>;
  /** Severity (paging) alarms to show in the alarm status widget (high-sev + low-sev composites) */
  alarms: cloudwatch.IAlarm[];
}

const PERIOD = cdk.Duration.minutes(5);
const RED = '#ff0000';
const ORANGE_RED = '#e74c3c';

/**
 * CloudWatch dashboard for the Items API
 */
export class ItemsApiDashboard extends Construct {
  constructor(scope: Construct, id: string, props: ItemsApiDashboardProps) {
    super(scope, id);

    const { envName, httpApi, functions, alarms } = props;

    const dashboard = new cloudwatch.Dashboard(this, 'Dashboard', {
      dashboardName: `${envName}-items-api`,
    });

    // ----- 1. Alarm section (severity / paging) -----
    dashboard.addWidgets(
      new cloudwatch.AlarmStatusWidget({
        title: 'Alarm Status',
        alarms,
        width: 24,
      }) as cloudwatch.IWidget
    );

    // ----- 2. API error rates  -----
    const apiCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: { ApiId: httpApi.apiId },
      period: PERIOD,
      statistic: 'Sum',
    });
    const api5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5xx',
      dimensionsMap: { ApiId: httpApi.apiId },
      period: PERIOD,
      statistic: 'Sum',
    });
    const api4xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4xx',
      dimensionsMap: { ApiId: httpApi.apiId },
      period: PERIOD,
      statistic: 'Sum',
    });
    const api5xxRate = new cloudwatch.MathExpression({
      expression: 'api5xx / FILL(apiCount, 1)',
      usingMetrics: { api5xx: api5xxMetric, apiCount: apiCountMetric },
      period: PERIOD,
      label: '5xx rate',
    });
    const api4xxRate = new cloudwatch.MathExpression({
      expression: 'api4xx / FILL(apiCount, 1)',
      usingMetrics: { api4xx: api4xxMetric, apiCount: apiCountMetric },
      period: PERIOD,
      label: '4xx rate',
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API 5XX Rate',
        left: [api5xxRate],
        width: 12,
        leftYAxis: { min: 0, max: 1, label: 'Rate', showUnits: false },
        leftAnnotations: [{ value: 0.05, label: 'Alarm Threshold', color: RED }],
      }) as cloudwatch.IWidget,
      new cloudwatch.GraphWidget({
        title: 'API 4XX Rate',
        left: [api4xxRate],
        width: 12,
        leftYAxis: { min: 0, max: 1, label: 'Rate', showUnits: false },
        leftAnnotations: [{ value: 0.1, label: 'Alarm Threshold', color: ORANGE_RED }],
      }) as cloudwatch.IWidget
    );

    // ----- 3. Lambda error rate / throttles (per function) -----
    const lambdaErrorMetrics: cloudwatch.IMetric[] = [];
    const lambdaThrottleMetrics: cloudwatch.IMetric[] = [];
    for (const [key, fn] of Object.entries(functions)) {
      const errId = `errors_${key}`;
      const invId = `invocations_${key}`;
      const errors = fn.metricErrors({ period: PERIOD }).with({ id: errId });
      const invocations = fn.metricInvocations({ period: PERIOD }).with({ id: invId });
      const errorRate = new cloudwatch.MathExpression({
        expression: `${errId} / FILL(${invId}, 1)`,
        usingMetrics: { [errId]: errors, [invId]: invocations },
        period: PERIOD,
        label: `${key} error rate`,
      });
      lambdaErrorMetrics.push(errorRate);
      lambdaThrottleMetrics.push(
        fn.metricThrottles({ period: PERIOD }).with({ label: `${key} throttles` })
      );
    }

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Lambda Error Rate (per function)',
        left: lambdaErrorMetrics,
        width: 12,
        leftYAxis: { min: 0, max: 1, label: 'Rate', showUnits: false },
        leftAnnotations: [{ value: 0.05, label: 'Alarm Threshold', color: RED }],
      }) as cloudwatch.IWidget,
      new cloudwatch.GraphWidget({
        title: 'Lambda Throttles (per function)',
        left: lambdaThrottleMetrics,
        width: 12,
        leftAnnotations: [{ value: 1, label: 'Alarm Threshold', color: RED }],
      }) as cloudwatch.IWidget
    );

    // ----- 4. Volume (API request count) -----
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Request Count',
        left: [apiCountMetric.with({ label: 'Count' })],
        width: 24,
      }) as cloudwatch.IWidget
    );

    // ----- 5. Latency (latency p50 / p95 / p99) -----
    const latencyDims = { ApiId: httpApi.apiId };
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'API Latency (p50 / p95 / p99)',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: latencyDims,
            period: PERIOD,
            statistic: 'p50',
            label: 'p50',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: latencyDims,
            period: PERIOD,
            statistic: 'p95',
            label: 'p95',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/ApiGateway',
            metricName: 'Latency',
            dimensionsMap: latencyDims,
            period: PERIOD,
            statistic: 'p99',
            label: 'p99',
          }),
        ],
        width: 24,
        leftYAxis: { label: 'ms' },
        leftAnnotations: [{ value: 3000, label: 'Alarm Threshold (p99)', color: RED }],
      }) as cloudwatch.IWidget
    );

    // ----- 6. Business metrics -----
    const envDims = { Environment: envName, service: 'items-api' };
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Business Metrics (items created / updated / deleted)',
        left: [
          new cloudwatch.Metric({
            namespace: 'ItemsService',
            metricName: 'ItemsCreated',
            dimensionsMap: envDims,
            period: PERIOD,
            statistic: 'Sum',
            label: 'ItemsCreated',
          }),
          new cloudwatch.Metric({
            namespace: 'ItemsService',
            metricName: 'ItemsUpdated',
            dimensionsMap: envDims,
            period: PERIOD,
            statistic: 'Sum',
            label: 'ItemsUpdated',
          }),
          new cloudwatch.Metric({
            namespace: 'ItemsService',
            metricName: 'ItemsDeleted',
            dimensionsMap: envDims,
            period: PERIOD,
            statistic: 'Sum',
            label: 'ItemsDeleted',
          }),
        ],
        width: 24,
      }) as cloudwatch.IWidget
    );
  }
}
