import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ItemsApiAlarmsProps {
  envName: string;
  httpApi: apigatewayv2.IHttpApi;
  functions: Record<string, lambda.IFunction>;
}

/**
 * CloudWatch alarms for the Items API (Lambda error rate & throttles, API 5xx/4xx rate, latency, composites)
 * Intended for prod only
 */
export class ItemsApiAlarms extends Construct {
  constructor(scope: Construct, id: string, props: ItemsApiAlarmsProps) {
    super(scope, id);

    const { envName, httpApi, functions } = props;

    const lambdaErrorAlarms: cloudwatch.IAlarm[] = [];
    const lambdaThrottleAlarms: cloudwatch.IAlarm[] = [];

    for (const [key, fn] of Object.entries(functions)) {
      const label = key.charAt(0).toUpperCase() + key.slice(1);

      const errors = fn.metricErrors({ period: cdk.Duration.minutes(5) });
      const invocations = fn.metricInvocations({ period: cdk.Duration.minutes(5) });
      const errorRate = new cloudwatch.MathExpression({
        expression: 'errors / FILL(invocations, 1)',
        usingMetrics: { errors, invocations },
        period: cdk.Duration.minutes(5),
      });
      lambdaErrorAlarms.push(
        new cloudwatch.Alarm(this, `LambdaErrors-${label}`, {
          alarmName: `${envName}-items-${key}-lambda-error-rate`,
          alarmDescription: `Lambda error rate >= 5% for ${label}`,
          metric: errorRate,
          threshold: 0.05,
          evaluationPeriods: 1,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        })
      );
      lambdaThrottleAlarms.push(
        new cloudwatch.Alarm(this, `LambdaThrottles-${label}`, {
          alarmName: `${envName}-items-${key}-lambda-throttles`,
          alarmDescription: `Lambda throttles (concurrency limit) for ${label}`,
          metric: fn.metricThrottles({ period: cdk.Duration.minutes(5) }),
          threshold: 1,
          evaluationPeriods: 1,
          comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
          treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
        })
      );
    }

    const api5xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5xx',
      dimensionsMap: { ApiId: httpApi.apiId },
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });
    const apiCountMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Count',
      dimensionsMap: { ApiId: httpApi.apiId },
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });
    const api5xxRate = new cloudwatch.MathExpression({
      expression: 'api5xx / FILL(apiCount, 1)',
      usingMetrics: {
        api5xx: api5xxMetric,
        apiCount: apiCountMetric,
      },
      period: cdk.Duration.minutes(5),
    });
    const api5xxAlarm = new cloudwatch.Alarm(this, 'Api5xx', {
      alarmName: `${envName}-items-api-5xx-rate`,
      alarmDescription: 'API Gateway 5xx error rate >= 5%',
      metric: api5xxRate,
      threshold: 0.05,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const api4xxMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '4xx',
      dimensionsMap: { ApiId: httpApi.apiId },
      period: cdk.Duration.minutes(5),
      statistic: 'Sum',
    });
    const api4xxRate = new cloudwatch.MathExpression({
      expression: 'api4xx / FILL(apiCount, 1)',
      usingMetrics: {
        api4xx: api4xxMetric,
        apiCount: apiCountMetric,
      },
      period: cdk.Duration.minutes(5),
    });
    const api4xxAlarm = new cloudwatch.Alarm(this, 'Api4xxRate', {
      alarmName: `${envName}-items-api-4xx-rate`,
      alarmDescription: 'API Gateway 4xx error rate >= 10% (higher threshold than 5xx)',
      metric: api4xxRate,
      threshold: 0.1,
      evaluationPeriods: 1,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    const apiLatencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: { ApiId: httpApi.apiId },
      period: cdk.Duration.minutes(5),
      statistic: 'p99',
    });
    const apiLatencyAlarm = new cloudwatch.Alarm(this, 'ApiLatency', {
      alarmName: `${envName}-items-api-latency`,
      alarmDescription: 'API Gateway p99 latency > 3s',
      metric: apiLatencyMetric,
      threshold: 3000,
      evaluationPeriods: 2,
      comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_THRESHOLD,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
    });

    new cloudwatch.CompositeAlarm(this, 'CompositeUnhealthyHigh', {
      compositeAlarmName: `${envName}-items-api-unhealthy-high`,
      alarmDescription: 'High severity: API 5xx, Lambda errors, or Lambda throttles',
      alarmRule: cloudwatch.AlarmRule.anyOf(
        api5xxAlarm,
        ...lambdaErrorAlarms,
        ...lambdaThrottleAlarms
      ),
    });

    new cloudwatch.CompositeAlarm(this, 'CompositeDegradedLatencyLow', {
      compositeAlarmName: `${envName}-items-api-degraded-latency-low`,
      alarmDescription: 'Low severity: API latency high',
      alarmRule: cloudwatch.AlarmRule.anyOf(apiLatencyAlarm),
    });

    new cloudwatch.CompositeAlarm(this, 'CompositeClientErrorsLow', {
      compositeAlarmName: `${envName}-items-api-client-errors-low`,
      alarmDescription: 'Low severity: high 4xx rate',
      alarmRule: cloudwatch.AlarmRule.anyOf(api4xxAlarm),
    });
  }
}
