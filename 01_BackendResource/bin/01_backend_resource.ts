#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { BackendResourceStack } from '../lib/backend_resource-stack';

const app = new cdk.App();
new BackendResourceStack(app, 'BackendResourceStack');
