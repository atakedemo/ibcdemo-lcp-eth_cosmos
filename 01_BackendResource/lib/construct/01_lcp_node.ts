import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Repository } from "aws-cdk-lib/aws-ecr";
import { AwsLogDriver, Cluster, ContainerImage, CpuArchitecture, FargateTaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Construct } from 'constructs';

export class LcpNode extends Construct {
  constructor(scope: Construct, id: string, _repositry: Repository) {
    super(scope, id);

    // --------------------
    // VPC
    // --------------------
    // Create new VPC with 2 Subnets
    const vpc = new ec2.Vpc(this, 'VPC', {
      natGateways: 0,
      subnetConfiguration: [{
        cidrMask: 24,
        name: "asterisk",
        subnetType: ec2.SubnetType.PUBLIC
      }]
    });

    // --------------------
    // Security Group
    // --------------------
    const securityGroup = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'IBC LPC Node',
      allowAllOutbound: true
    });

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic from anywhere',
    );

    securityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    // --------------------
    // IAM(Role, Policy)
    // --------------------
    const role = new iam.Role(this, 'lpcEcsRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"),
      ],
    })

    // --------------------
    // AWS ECS & ECR
    // --------------------
    // ECR
    const repository = Repository.fromRepositoryName(
      this,
      "EcrRepository",
      `repo-ibc-demo-ethereum-cosmos`,
    );

    // ECS Cluster
    const cluster = new Cluster(this, "EcsCluster", {
      clusterName: `ibc-demo-ethereum-cosmos`,
      vpc: vpc,
    });

    // ECS Task-definition
    const taskDefinition = new FargateTaskDefinition(this, "EcsTaskDefinition", {
      cpu: 256,
      memoryLimitMiB: 512,
      runtimePlatform: {
        cpuArchitecture: CpuArchitecture.X86_64,
      },
    });
    taskDefinition.addContainer("LcpNodeContainer", {
      image: ContainerImage.fromEcrRepository(_repositry),
      portMappings: [
        { containerPort: 80, hostPort: 80 },
        { containerPort: 443, hostPort: 443 }
      ],
    })
  }
}
