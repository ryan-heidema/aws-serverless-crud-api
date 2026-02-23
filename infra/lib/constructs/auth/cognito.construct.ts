import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export interface ItemsAuthProps {
  envName: string;
  removalPolicy: cdk.RemovalPolicy;
}

/** Cognito User Pool and app client for Items API JWT auth */
export class ItemsAuth extends Construct {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: ItemsAuthProps) {
    super(scope, id);

    const { envName, removalPolicy } = props;

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: `${envName}-items-user-pool`,
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      removalPolicy,
    });

    this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
      authFlows: {
        userPassword: true,
      },
    });
  }
}
