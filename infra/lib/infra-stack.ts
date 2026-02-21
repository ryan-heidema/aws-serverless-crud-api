import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as authorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as path from "path";

export interface InfraStackProps extends cdk.StackProps {
  envName: string;
}

export class InfraStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: InfraStackProps) {
    super(scope, id, props);

    const { envName } = props;
    const isProd = envName === "prod";

    const removalPolicy = isProd
      ? cdk.RemovalPolicy.RETAIN
      : cdk.RemovalPolicy.DESTROY;

    // Cognito User Pool
    const userPool = new cognito.UserPool(this, `${envName}-UserPool`, {
      userPoolName: `${envName}-items-user-pool`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy,
    });

    const userPoolClient = new cognito.UserPoolClient(
      this,
      `${envName}-UserPoolClient`,
      {
        userPool,
        generateSecret: false,
        authFlows: {
          userPassword: true,
        },
      }
    );

    // DynamoDB Table
    const table = new dynamodb.Table(this, `${envName}-ItemsTable`, {
      tableName: `${envName}-items`,
      partitionKey: { name: "userId", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      ...(isProd && {
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: true,
        },
      }),
    });

    const lambdaEnv = {
      TABLE_NAME: table.tableName,
      ENV_NAME: envName,
    };

    // Lambda function for creating items
    const createFunction = new NodejsFunction(
      this,
      `${envName}-CreateFunction`,
      {
        functionName: `${envName}-create-item`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../../src/handlers/create.ts"),
        environment: lambdaEnv,
      }
    );

    // Lambda function for listing items
    const listFunction = new NodejsFunction(this, `${envName}-ListFunction`, {
      functionName: `${envName}-list-items`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/handlers/list.ts"),
      environment: lambdaEnv,
    });

    // Lambda function for getting a single item
    const getFunction = new NodejsFunction(this, `${envName}-GetFunction`, {
      functionName: `${envName}-get-item`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "handler",
      entry: path.join(__dirname, "../../src/handlers/get.ts"),
      environment: lambdaEnv,
    });

    // Lambda function for updating items
    const updateFunction = new NodejsFunction(
      this,
      `${envName}-UpdateFunction`,
      {
        functionName: `${envName}-update-item`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../../src/handlers/update.ts"),
        environment: lambdaEnv,
      }
    );

    // Lambda function for deleting items
    const deleteFunction = new NodejsFunction(
      this,
      `${envName}-DeleteFunction`,
      {
        functionName: `${envName}-delete-item`,
        runtime: lambda.Runtime.NODEJS_20_X,
        handler: "handler",
        entry: path.join(__dirname, "../../src/handlers/delete.ts"),
        environment: lambdaEnv,
      }
    );

    // Grant Lambda functions access to DynamoDB table
    table.grantReadWriteData(createFunction);
    table.grantReadData(listFunction);
    table.grantReadWriteData(getFunction);
    table.grantReadWriteData(updateFunction);
    table.grantReadWriteData(deleteFunction);

    // API Gateway HTTP API
    const httpApi = new apigatewayv2.HttpApi(this, `${envName}-HttpApi`, {
      apiName: `${envName}-items-api`,
      description: `CRUD API for Items (${envName})`,
    });

    const issuerUrl = `https://cognito-idp.${this.region}.amazonaws.com/${userPool.userPoolId}`;
    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer(
      `${envName}-JwtAuthorizer`,
      issuerUrl,
      {
        jwtAudience: [userPoolClient.userPoolClientId],
      }
    );

    // Add routes (all protected by JWT)
    httpApi.addRoutes({
      path: "/items",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        `${envName}-ListIntegration`,
        listFunction
      ),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/items",
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration(
        `${envName}-CreateIntegration`,
        createFunction
      ),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/items/{id}",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration(
        `${envName}-GetIntegration`,
        getFunction
      ),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/items/{id}",
      methods: [apigatewayv2.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration(
        `${envName}-UpdateIntegration`,
        updateFunction
      ),
      authorizer: jwtAuthorizer,
    });

    httpApi.addRoutes({
      path: "/items/{id}",
      methods: [apigatewayv2.HttpMethod.DELETE],
      integration: new integrations.HttpLambdaIntegration(
        `${envName}-DeleteIntegration`,
        deleteFunction
      ),
      authorizer: jwtAuthorizer,
    });

    // Outputs (export names allow targeting a specific env's outputs)
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.url!,
      description: `HTTP API endpoint URL (${envName})`,
      exportName: `${envName}-ApiUrl`,
    });

    new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
      description: `DynamoDB table name (${envName})`,
      exportName: `${envName}-TableName`,
    });

    new cdk.CfnOutput(this, "UserPoolId", {
      value: userPool.userPoolId,
      description: `Cognito User Pool ID (${envName})`,
      exportName: `${envName}-UserPoolId`,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: userPoolClient.userPoolClientId,
      description: `Cognito App Client ID (${envName})`,
      exportName: `${envName}-UserPoolClientId`,
    });
  }
}
