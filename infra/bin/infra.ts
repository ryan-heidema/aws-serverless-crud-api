#!/usr/local/opt/node/bin/node
import * as cdk from 'aws-cdk-lib';

import { InfraStack } from '../lib/infra-stack';

const app = new cdk.App();

const envName = app.node.tryGetContext('env') ?? 'dev';

const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
new InfraStack(app, `InfraStack-${envName}`, {
  envName,
  env: {
    ...(account !== undefined && { account }),
    ...(region !== undefined && { region }),
  },
});
