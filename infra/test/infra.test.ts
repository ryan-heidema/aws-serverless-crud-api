import { Template } from "aws-cdk-lib/assertions";
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";

describe("InfraStack", () => {
  let app: cdk.App;
  let stack: InfraStack;
  let template: Template;

  beforeEach(() => {
    app = new cdk.App();
    stack = new InfraStack(app, "TestStack", {
      env: {
        account: "123456789012",
        region: "us-east-1",
      },
    });
    template = Template.fromStack(stack);
  });

  it("creates a DynamoDB table", () => {
    template.hasResourceProperties("AWS::DynamoDB::Table", {
      BillingMode: "PAY_PER_REQUEST",
      KeySchema: [
        {
          AttributeName: "id",
          KeyType: "HASH",
        },
      ],
      AttributeDefinitions: [
        {
          AttributeName: "id",
          AttributeType: "S",
        },
      ],
    });
  });

  it("creates four Lambda functions", () => {
    template.resourceCountIs("AWS::Lambda::Function", 4);

    // Check that all functions have the TABLE_NAME environment variable and correct runtime
    template.hasResourceProperties("AWS::Lambda::Function", {
      Runtime: "nodejs20.x",
      Handler: "index.handler",
    });

    // Verify TABLE_NAME is set (it's a Ref to the table)
    const functions = template.findResources("AWS::Lambda::Function");
    Object.values(functions).forEach((func: any) => {
      expect(func.Properties.Environment.Variables.TABLE_NAME).toBeDefined();
    });
  });

  it("creates an API Gateway HTTP API", () => {
    template.hasResourceProperties("AWS::ApiGatewayV2::Api", {
      ProtocolType: "HTTP",
      Description: "CRUD API for Items",
    });
  });

  it("creates API routes for all CRUD operations", () => {
    // Check for POST /items
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "POST /items",
    });

    // Check for GET /items/{id}
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "GET /items/{id}",
    });

    // Check for PUT /items/{id}
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "PUT /items/{id}",
    });

    // Check for DELETE /items/{id}
    template.hasResourceProperties("AWS::ApiGatewayV2::Route", {
      RouteKey: "DELETE /items/{id}",
    });
  });

  it("grants Lambda functions access to DynamoDB table", () => {
    // Each Lambda function should have a policy allowing DynamoDB access
    template.resourceCountIs("AWS::IAM::Policy", 4);

    // Verify at least one policy has DynamoDB permissions
    const policies = template.findResources("AWS::IAM::Policy");
    const hasDynamoAccess = Object.values(policies).some((policy: any) => {
      const statements = policy.Properties.PolicyDocument.Statement;
      return statements.some((stmt: any) => {
        return (
          stmt.Effect === "Allow" &&
          Array.isArray(stmt.Action) &&
          stmt.Action.includes("dynamodb:PutItem") &&
          stmt.Action.includes("dynamodb:GetItem") &&
          stmt.Action.includes("dynamodb:UpdateItem") &&
          stmt.Action.includes("dynamodb:DeleteItem")
        );
      });
    });
    expect(hasDynamoAccess).toBe(true);
  });

  it("outputs API URL and table name", () => {
    template.hasOutput("ApiUrl", {
      Description: "HTTP API endpoint URL",
    });

    template.hasOutput("TableName", {
      Description: "DynamoDB table name",
    });
  });
});
