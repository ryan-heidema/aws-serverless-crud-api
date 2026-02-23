import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

import { ItemsHttpApi } from '../constructs/api/items-http-api.construct';
import { ItemsAuth } from '../constructs/auth/cognito.construct';
import { ItemsFunctions } from '../constructs/compute/items-functions.construct';
import { ItemsTable } from '../constructs/data/items-table.construct';
import { ItemsApiAlarms } from '../constructs/observability/items-alarms.construct';
import { ItemsApiDashboard } from '../constructs/observability/items-dashboard.construct';

export interface InfraStackProps extends cdk.StackProps {
  envName: string;
}

/** Single stack for Items API: auth, data, compute, API, and optional observability */
export class ItemsApiStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { envName } = props;
    const isProd = envName === 'prod';
    const removalPolicy = isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    const auth = new ItemsAuth(this, 'Auth', { envName, removalPolicy });

    const table = new ItemsTable(this, 'Table', { envName, removalPolicy });

    const functions = new ItemsFunctions(this, 'Functions', {
      envName,
      table: table.table as dynamodb.ITable,
    });

    const api = new ItemsHttpApi(this, 'Api', {
      envName,
      userPool: auth.userPool,
      userPoolClient: auth.userPoolClient,
      functions: functions.functions,
    });

    if (isProd) {
      const alarms = new ItemsApiAlarms(this, 'Alarms', {
        envName,
        httpApi: api.httpApi as apigatewayv2.IHttpApi,
        functions: functions.functions,
      });

      new ItemsApiDashboard(this, 'Dashboard', {
        envName,
        httpApi: api.httpApi as apigatewayv2.IHttpApi,
        functions: functions.functions,
        alarms: alarms.alarms,
      });
    }

    // Outputs (export names allow targeting a specific env's outputs)
    new cdk.CfnOutput(this, 'ApiUrl', {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      value: api.httpApi.url!,
      description: `HTTP API endpoint URL (${envName})`,
      exportName: `${envName}-ApiUrl`,
    });

    new cdk.CfnOutput(this, 'TableName', {
      value: table.table.tableName,
      description: `DynamoDB table name (${envName})`,
      exportName: `${envName}-TableName`,
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: auth.userPool.userPoolId,
      description: `Cognito User Pool ID (${envName})`,
      exportName: `${envName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
      description: `Cognito App Client ID (${envName})`,
      exportName: `${envName}-UserPoolClientId`,
    });
  }
}
