import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { EcrStack } from './construct/02_ecr';
import { LcpNode } from './construct/01_lcp_node';

export class BackendResourceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const vpc = new Vpc(this, "Vpc", resourceName);
    const ecr = new EcrStack(this, 'LcpNodeRcr');
    console.log(ecr._repositry.repositoryUri);
    const lcpNode = new LcpNode(this, 'LcpNodeRes', ecr._repositry);
  }
}
