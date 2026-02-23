import * as cdk from 'aws-cdk-lib';
import * as apigatewayv2 from 'aws-cdk-lib/aws-apigatewayv2';
import * as authorizers from 'aws-cdk-lib/aws-apigatewayv2-authorizers';
import * as integrations from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ItemsHttpApiProps {
  envName: string;
  userPool: cognito.IUserPool;
  userPoolClient: cognito.IUserPoolClient;
  functions: Record<string, lambda.IFunction>;
}

const API_VERSION = 'v1';

/** HTTP API with JWT auth, throttling, and CRUD routes */
export class ItemsHttpApi extends Construct {
  public readonly httpApi: apigatewayv2.HttpApi;

  constructor(scope: Construct, id: string, props: ItemsHttpApiProps) {
    super(scope, id);

    const { envName, userPool, userPoolClient, functions } = props;
    const isProd = envName === 'prod';
    const throttlingRateLimit = isProd ? 25 : 10;
    const throttlingBurstLimit = isProd ? 50 : 20;

    // Add CORS with explicit origins when frontend exists; avoid * in prod
    this.httpApi = new apigatewayv2.HttpApi(this, 'HttpApi', {
      apiName: `${envName}-items-api`,
      description: `CRUD API for Items (${envName})`,
      createDefaultStage: true,
    });

    const defaultStage = this.httpApi.defaultStage!.node.defaultChild as apigatewayv2.CfnStage;
    defaultStage.defaultRouteSettings = {
      throttlingBurstLimit,
      throttlingRateLimit,
    };

    const region = cdk.Stack.of(this).region;
    const issuerUrl = `https://cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`;

    const jwtAuthorizer = new authorizers.HttpJwtAuthorizer('JwtAuthorizer', issuerUrl, {
      jwtAudience: [userPoolClient.userPoolClientId],
    });

    const { create, list, get, update, delete: deleteFn } = functions;

    this.httpApi.addRoutes({
      path: `/${API_VERSION}/items`,
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('ListIntegration', list!),
      authorizer: jwtAuthorizer,
    });

    this.httpApi.addRoutes({
      path: `/${API_VERSION}/items`,
      methods: [apigatewayv2.HttpMethod.POST],
      integration: new integrations.HttpLambdaIntegration('CreateIntegration', create!),
      authorizer: jwtAuthorizer,
    });

    this.httpApi.addRoutes({
      path: `/${API_VERSION}/items/{id}`,
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration('GetIntegration', get!),
      authorizer: jwtAuthorizer,
    });

    this.httpApi.addRoutes({
      path: `/${API_VERSION}/items/{id}`,
      methods: [apigatewayv2.HttpMethod.PUT],
      integration: new integrations.HttpLambdaIntegration('UpdateIntegration', update!),
      authorizer: jwtAuthorizer,
    });

    this.httpApi.addRoutes({
      path: `/${API_VERSION}/items/{id}`,
      methods: [apigatewayv2.HttpMethod.DELETE],
      integration: new integrations.HttpLambdaIntegration('DeleteIntegration', deleteFn!),
      authorizer: jwtAuthorizer,
    });
  }
}
