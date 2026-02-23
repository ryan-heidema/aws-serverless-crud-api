import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export interface ItemsTableProps {
  envName: string;
  removalPolicy: cdk.RemovalPolicy;
}

/** DynamoDB table for Items with optional PITR in prod */
export class ItemsTable extends Construct {
  public readonly table: dynamodb.Table;

  constructor(scope: Construct, id: string, props: ItemsTableProps) {
    super(scope, id);

    const { envName, removalPolicy } = props;
    const isProd = envName === 'prod';

    this.table = new dynamodb.Table(this, 'Table', {
      tableName: `${envName}-items`,
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      ...(isProd && {
        pointInTimeRecoverySpecification: {
          pointInTimeRecoveryEnabled: true,
        },
      }),
    });
  }
}
