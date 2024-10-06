import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Repository } from "aws-cdk-lib/aws-ecr";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
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
    const securityGroupEc2 = new ec2.SecurityGroup(this, 'SecurityGroup', {
      vpc,
      description: 'IBC LPC Node',
      allowAllOutbound: true
    });

    securityGroupEc2.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic from anywhere',
    );

    securityGroupEc2.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    const securityGroupCluster = new ec2.SecurityGroup(this, 'SecurityGroupCluster', {
      vpc,
      description: 'IBC LPC Node',
      allowAllOutbound: true
    });

    securityGroupCluster.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'allow HTTPS traffic from anywhere',
    );

    securityGroupCluster.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'allow HTTP traffic from anywhere',
    );

    // --------------------
    // IAM(Role, Policy)
    // --------------------
    const statementDescriptionLogGr = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "logs:DescribeLogGroups"
      ],
      resources: [
        "*"
      ]
    });

    const statementSsm = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ssmmessages:CreateControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:OpenDataChannel"
      ],
      resources: [
        "*"
      ]
    });

    const ecsTaskRole = new iam.Role(this, 'lpcEcsRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonECSTaskExecutionRolePolicy"
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMManagedInstanceCore"),
      ],
    })
    ecsTaskRole.addToPolicy(statementSsm);
    ecsTaskRole.addToPolicy(statementDescriptionLogGr);

    // EC2インスタンス用のIAMロールを作成してSSMポリシーをアタッチ
    const ec2Role = new iam.Role(this, 'Ec2InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    // SSMのアクセスを許可するポリシーを追加
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    // --------------------
    // EC2
    // --------------------
    const instanceType = new ec2.InstanceType('t3.xlarge');
    const autoScalingGroup = new ecs.AsgCapacityProvider(this, 'IbcAsgCapacityProvider', {
      autoScalingGroup: new autoscaling.AutoScalingGroup(this, 'IbcEcsAsg', {
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
        instanceType,
        machineImage: ecs.EcsOptimizedImage.amazonLinux2(
          ecs.AmiHardwareType.STANDARD,
        ),
        minCapacity: 1,
        maxCapacity: 1,
        role: ec2Role,
        securityGroup: securityGroupEc2,
        blockDevices: [
          {
            deviceName: "/dev/xvda",
            volume: autoscaling.BlockDeviceVolume.ebs(100),
          },
        ]
      }),
    });


    // --------------------
    // AWS ECS & ECR
    // --------------------
    // ECS Cluster
    const cluster = new ecs.Cluster(this, "EcsCluster", {
      clusterName: `ibc-demo-ethereum-cosmos`,
      vpc: vpc,
    });
    cluster.addAsgCapacityProvider(autoScalingGroup);

    const taskDefinition = new ecs.Ec2TaskDefinition(this, 'TaskDef', {
      networkMode: ecs.NetworkMode.BRIDGE,
      taskRole: ecsTaskRole,
    });
    
    taskDefinition.addContainer("LcpNodeContainer", {
      image: ecs.ContainerImage.fromEcrRepository(_repositry),
      cpu: 512,
      memoryLimitMiB: 2048,
      portMappings: [
        { containerPort: 80 },
        { containerPort: 443 }
      ],
      logging: new ecs.AwsLogDriver({
        streamPrefix: "LcpNode",
        mode: ecs.AwsLogDriverMode.NON_BLOCKING,
      }),
      privileged: true
    });

    const ec2Service = new ecs.Ec2Service(this, 'Ec2Service', {
      cluster,
      taskDefinition,
    });
  }
}
