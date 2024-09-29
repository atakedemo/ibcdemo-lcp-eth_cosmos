# ibcdemo-lcp-eth_cosmos

IBC（LCP）を用いたCosmos&lt;>Ethereumのブリッジのデモ

## 手順

### 1.環境構築

Dockerコンテナのビルド

```bash
docker-compose up -d --build
```

構築したコンテナに入る

```bash
docker exec -it ubuntu-dev /bin/bash
```

### 2. AWS ECSセットアップ

1. AWSコンソールにログインし、ECS (Elastic Container Service)を開く。
2. 「クラスター」を選択して、「クラスターの作成」をクリックする。
3. クラスターの設定で、「Networking only」を選択して、Fargateを使うクラスターを作成する。名前は適当に設定してOKや。

```bash
aws ecr get-login-password --region ap-northeast-1 | docker login --username AWS --password-stdin 594175341170.dkr.ecr.ap-northeast-1.amazonaws.com
docker build -t tutorial/ibc-demo-eth-cosmos .
docker tag tutorial/ibc-demo-eth-cosmos:latest 594175341170.dkr.ecr.ap-northeast-1.amazonaws.com/tutorial/ibc-demo-eth-cosmos:latest
docker push 594175341170.dkr.ecr.ap-northeast-1.amazonaws.com/tutorial/ibc-demo-eth-cosmos:latest
```

### 3.AWS ECSへのアクセス

1. （初回のみ）AWS SSMプラグインの有効化

```bash
curl "https://s3.amazonaws.com/session-manager-downloads/plugin/latest/mac/sessionmanager-bundle.zip" -o "sessionmanager-bundle.zip"
unzip sessionmanager-bundle.zip
sudo ./sessionmanager-bundle/install -i /usr/local/sessionmanagerplugin -b /usr/local/bin/session-manager-plugin

# インストールの確認
session-manager-plugin
```

2. （初回のみ）ECSExecの有効化

```bash
aws ecs update-service --enable-execute-command --region ap-northeast-1 --cluster "ibc-demo-ethereum-cosmos" --service "BackendResourceStack-LcpNodeResEcsFargateService3FD40604-g8MqRRzL4tVW" | grep enableExecuteCommand
```

1. Fargateへアクセス
  
```bash
aws ecs execute-command --region ap-northeast-1 --cluster "ibc-demo-ethereum-cosmos" --task "96f1ca4c75514b4dbc64440277d50c36" --container "LcpNodeContainer" --interactive --command "/bin/sh"
```

### 2.Intel SGXのセットアップ

```bash
curl -LO https://download.01.org/intel-sgx/sgx-linux/2.19/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.19.100.3.bin
chmod +x ./sgx_linux_x64_sdk_2.19.100.3.bin
echo -e 'no\n/opt' | ./sgx_linux_x64_sdk_2.19.100.3.bin
source /opt/sgxsdk/environment
```

## メモ

* AWS ECSで実行環境を立てる
  * ECRへのアクセスがエラーになる
  * 権限設定（IAM）
  * ネットワーク設定
* X

# 参考資料

* [【AWS】M2 macでECSにデプロイしようとしたら、こけてしまう話](https://note.com/ryuone/n/nfae3cc204880)
* [ECS FargateにSSMを利用してSSH接続する(チュートリアル)](https://qiita.com/koji0705/items/005ea6d7c21ddd24ebb3)