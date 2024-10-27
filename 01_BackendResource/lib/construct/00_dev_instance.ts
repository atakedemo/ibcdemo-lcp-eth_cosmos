import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as autoscaling from 'aws-cdk-lib/aws-autoscaling';
import { Construct } from 'constructs';

export class DevInstance extends Construct {
  constructor(scope: Construct, id: string, region: string, amiId: string) {
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

    const ec2TackRole = new iam.Role(this, 'lpcEcsRole', {
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
    ec2TackRole.addToPolicy(statementSsm);
    ec2TackRole.addToPolicy(statementDescriptionLogGr);

    // EC2インスタンス用のIAMロールを作成してSSMポリシーをアタッチ
    const ec2Role = new iam.Role(this, 'Ec2InstanceRole', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
    });

    // SSMのアクセスを許可するポリシーを追加
    ec2Role.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore'));

    // --------------------
    // EC2
    // --------------------
    const instanceType = new ec2.InstanceType('m6i.xlarge');
    const instance = new ec2.Instance(this, 'DevInstanceUbuntu', {
        instanceType,
        vpc,
        vpcSubnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
        machineImage: ec2.MachineImage.genericLinux({
            ['ap-northeast-1']: 'ami-0eba6c58b7918d3a1',
        }),
        role: ec2Role,
        securityGroup: securityGroupEc2,
        blockDevices: [
          {
            deviceName: "/dev/sda1",
            volume: ec2.BlockDeviceVolume.ebs(100),
          },
        ],
        enclaveEnabled: true
    })
  }
}
