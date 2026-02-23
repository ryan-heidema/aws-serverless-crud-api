import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { ItemsApiStack } from '../lib/stacks/items-api.stack';

describe('ItemsApiStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new ItemsApiStack(app, 'TestStack', {
      envName: 'prod',
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
    });
    template = Template.fromStack(stack);
  });

  it('creates a DynamoDB table with env prefix', () => {
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      BillingMode: 'PAY_PER_REQUEST',
      TableName: 'prod-items',
      KeySchema: [
        { AttributeName: 'userId', KeyType: 'HASH' },
        { AttributeName: 'id', KeyType: 'RANGE' },
      ],
      AttributeDefinitions: [
        { AttributeName: 'userId', AttributeType: 'S' },
        { AttributeName: 'id', AttributeType: 'S' },
      ],
    });
  });

  it('creates five Lambda functions', () => {
    template.resourceCountIs('AWS::Lambda::Function', 5);

    // Check that all functions have the TABLE_NAME environment variable and correct runtime
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      Handler: 'index.handler',
    });

    // Verify TABLE_NAME is set (it's a Ref to the table)
    const functions = template.findResources('AWS::Lambda::Function');
    Object.values(functions).forEach((func: any) => {
      expect(func.Properties.Environment.Variables.TABLE_NAME).toBeDefined();
    });
  });

  it('creates an API Gateway HTTP API with env prefix', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Api', {
      ProtocolType: 'HTTP',
      Name: 'prod-items-api',
      Description: 'CRUD API for Items (prod)',
    });
  });

  it('configures stage throttling (rate + burst)', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Stage', {
      DefaultRouteSettings: {
        ThrottlingBurstLimit: 50,
        ThrottlingRateLimit: 25,
      },
    });
  });

  it('creates API routes for all CRUD operations', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /v1/items',
    });
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'POST /v1/items',
    });

    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /v1/items/{id}',
    });

    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'PUT /v1/items/{id}',
    });

    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'DELETE /v1/items/{id}',
    });
  });

  it('grants Lambda functions access to DynamoDB table', () => {
    template.resourceCountIs('AWS::IAM::Policy', 5);

    // Verify at least one policy has DynamoDB permissions
    const policies = template.findResources('AWS::IAM::Policy');
    const hasDynamoAccess = Object.values(policies).some((policy: any) => {
      const statements = policy.Properties.PolicyDocument.Statement;
      return statements.some((stmt: any) => {
        return (
          stmt.Effect === 'Allow' &&
          Array.isArray(stmt.Action) &&
          stmt.Action.includes('dynamodb:PutItem') &&
          stmt.Action.includes('dynamodb:GetItem') &&
          stmt.Action.includes('dynamodb:UpdateItem') &&
          stmt.Action.includes('dynamodb:DeleteItem')
        );
      });
    });
    expect(hasDynamoAccess).toBe(true);
  });

  it('creates Cognito User Pool and App Client with env prefix', () => {
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'prod-items-user-pool',
    });
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
  });

  it('creates JWT authorizer for HTTP API', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Authorizer', {
      AuthorizerType: 'JWT',
    });
  });

  it('outputs API URL, table name, and Cognito IDs with env export names', () => {
    template.hasOutput('ApiUrl', {
      Description: 'HTTP API endpoint URL (prod)',
      Export: { Name: 'prod-ApiUrl' },
    });
    template.hasOutput('TableName', {
      Description: 'DynamoDB table name (prod)',
      Export: { Name: 'prod-TableName' },
    });
    template.hasOutput('UserPoolId', {
      Description: 'Cognito User Pool ID (prod)',
      Export: { Name: 'prod-UserPoolId' },
    });
    template.hasOutput('UserPoolClientId', {
      Description: 'Cognito App Client ID (prod)',
      Export: { Name: 'prod-UserPoolClientId' },
    });
  });

  describe('CloudWatch alarms', () => {
    it('creates the expected number of alarms', () => {
      template.resourceCountIs('AWS::CloudWatch::Alarm', 13);
    });

    it('creates the expected number of composite alarms', () => {
      template.resourceCountIs('AWS::CloudWatch::CompositeAlarm', 3);
    });

    it('uses 5% threshold for at least one error-rate alarm', () => {
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      const withThreshold = Object.values(alarms).filter(
        (r: any) => r.Properties?.Threshold === 0.05
      );
      expect(withThreshold.length).toBeGreaterThanOrEqual(1);
    });

    it('uses metric math for at least one alarm', () => {
      const alarms = template.findResources('AWS::CloudWatch::Alarm');
      const withMetrics = Object.values(alarms).filter(
        (r: any) => Array.isArray(r.Properties?.Metrics) && r.Properties.Metrics.length > 0
      );
      expect(withMetrics.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('CloudWatch dashboard', () => {
    it('creates dashboard with env-prefixed name', () => {
      template.resourceCountIs('AWS::CloudWatch::Dashboard', 1);
      template.hasResourceProperties('AWS::CloudWatch::Dashboard', {
        DashboardName: 'prod-items-api',
      });
    });
  });
});
