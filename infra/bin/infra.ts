#!/usr/local/opt/node/bin/node
import * as cdk from "aws-cdk-lib";
import { InfraStack } from "../lib/infra-stack";

const app = new cdk.App();

const envName = app.node.tryGetContext("env") ?? "dev";

new InfraStack(app, `InfraStack-${envName}`, {
  envName,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
