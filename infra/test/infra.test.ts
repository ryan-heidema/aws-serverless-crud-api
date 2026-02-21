import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { InfraStack } from '../lib/infra-stack';

describe('InfraStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new InfraStack(app, 'TestStack', {
      envName: 'dev',
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
      TableName: 'dev-items',
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
      Name: 'dev-items-api',
      Description: 'CRUD API for Items (dev)',
    });
  });

  it('creates API routes for all CRUD operations', () => {
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /items',
    });
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'POST /items',
    });

    // Check for GET /items/{id}
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'GET /items/{id}',
    });

    // Check for PUT /items/{id}
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'PUT /items/{id}',
    });

    // Check for DELETE /items/{id}
    template.hasResourceProperties('AWS::ApiGatewayV2::Route', {
      RouteKey: 'DELETE /items/{id}',
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
      UserPoolName: 'dev-items-user-pool',
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
      Description: 'HTTP API endpoint URL (dev)',
      Export: { Name: 'dev-ApiUrl' },
    });
    template.hasOutput('TableName', {
      Description: 'DynamoDB table name (dev)',
      Export: { Name: 'dev-TableName' },
    });
    template.hasOutput('UserPoolId', {
      Description: 'Cognito User Pool ID (dev)',
      Export: { Name: 'dev-UserPoolId' },
    });
    template.hasOutput('UserPoolClientId', {
      Description: 'Cognito App Client ID (dev)',
      Export: { Name: 'dev-UserPoolClientId' },
    });
  });
});
