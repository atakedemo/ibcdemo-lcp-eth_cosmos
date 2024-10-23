import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DevInstance } from './construct/00_dev_instance';
import { EcrStack } from './construct/02_ecr';
import { LcpNode } from './construct/01_lcp_node';

export class BackendResourceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const vpc = new Vpc(this, "Vpc", resourceName);
    // const ecr = new EcrStack(this, 'LcpNodeRcr');
    // const lcpNode = new LcpNode(this, 'LcpNodeRes', ecr._repositry);
    new DevInstance(this, 'DevInstance', 'ap-northeast-1', 'ami-0eba6c58b7918d3a1')
  }
}
