
import { Repository } from "aws-cdk-lib/aws-ecr";
import { Construct } from 'constructs';

export class EcrStack extends Construct {
  public readonly _repositryUri: string;
  public readonly _repositry: Repository;
  
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // --------------------
    // ECR
    // --------------------
    this._repositry = new Repository(
      this,
      "EcrRepository",
      {
        repositoryName: `repo-ibc-demo-ethereum-cosmos`,
      }
    );
  }
}
