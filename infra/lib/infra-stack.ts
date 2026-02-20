import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as path from "path";

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const table = new dynamodb.Table(this, "ItemsTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For dev - change to RETAIN for prod
    });

    // Lambda function for creating items
    const createFunction = new NodejsFunction(this, "CreateFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/handlers/create.ts"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Lambda function for getting items
    const getFunction = new NodejsFunction(this, "GetFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/handlers/get.ts"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Lambda function for updating items
    const updateFunction = new NodejsFunction(this, "UpdateFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/handlers/update.ts"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Lambda function for deleting items
    const deleteFunction = new NodejsFunction(this, "DeleteFunction", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/handlers/delete.ts"),
      environment: {
        TABLE_NAME: table.tableName,
      },
    });

    // Grant Lambda functions access to DynamoDB table
    table.grantReadWriteData(createFunction);
    table.grantReadWriteData(getFunction);
    table.grantReadWriteData(updateFunction);
    table.grantReadWriteData(deleteFunction);

    // API Gateway HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      description: "CRUD API for Items",
    });

    // Add routes
    httpApi.addRoutes({
      path: "/items",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        "CreateIntegration",
        createFunction
      ),
    });

    httpApi.addRoutes({
      path: "/items/{id}",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        "GetIntegration",
        getFunction
      ),
    });

    httpApi.addRoutes({
      path: "/items/{id}",
      methods: [apigatewayv2.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration(
        "UpdateIntegration",
        updateFunction
      ),
    });

    httpApi.addRoutes({
      path: "/items/{id}",
      methods: [apigatewayv2.HttpMethod.DELETE],
      integration: new integrations.HttpLambdaIntegration(
        "DeleteIntegration",
        deleteFunction
      ),
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.url!,
      description: "HTTP API endpoint URL",
    });

    new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
      description: "DynamoDB table name",
    });
  }
}
