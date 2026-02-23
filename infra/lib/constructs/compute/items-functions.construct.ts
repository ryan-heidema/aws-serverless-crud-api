import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

export interface ItemsFunctionsProps {
  envName: string;
  table: dynamodb.ITable;
}

/** All CRUD Lambda functions and their table grants */
export class ItemsFunctions extends Construct {
  public readonly functions: Record<string, lambda.IFunction>;

  constructor(scope: Construct, id: string, props: ItemsFunctionsProps) {
    super(scope, id);

    const { envName, table } = props;

    const lambdaEnv = {
      TABLE_NAME: table.tableName,
      ENV_NAME: envName,
    };

    const handlersDir = path.join(__dirname, '../../../../src/handlers');
    const createFunction = new NodejsFunction(this, 'CreateFunction', {
      functionName: `${envName}-create-item`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'create.ts'),
      environment: lambdaEnv,
    });
    const listFunction = new NodejsFunction(this, 'ListFunction', {
      functionName: `${envName}-list-items`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'list.ts'),
      environment: lambdaEnv,
    });
    const getFunction = new NodejsFunction(this, 'GetFunction', {
      functionName: `${envName}-get-item`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'get.ts'),
      environment: lambdaEnv,
    });
    const updateFunction = new NodejsFunction(this, 'UpdateFunction', {
      functionName: `${envName}-update-item`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'update.ts'),
      environment: lambdaEnv,
    });
    const deleteFunction = new NodejsFunction(this, 'DeleteFunction', {
      functionName: `${envName}-delete-item`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'handler',
      entry: path.join(handlersDir, 'delete.ts'),
      environment: lambdaEnv,
    });

    table.grantReadWriteData(createFunction);
    table.grantReadData(listFunction);
    table.grantReadWriteData(getFunction);
    table.grantReadWriteData(updateFunction);
    table.grantReadWriteData(deleteFunction);

    this.functions = {
      create: createFunction,
      list: listFunction,
      get: getFunction,
      update: updateFunction,
      delete: deleteFunction,
    };
  }
}
