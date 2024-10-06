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
docker build -t repo-ibc-demo-ethereum-cosmos . --platform linux/amd64
docker tag repo-ibc-demo-ethereum-cosmos:latest 594175341170.dkr.ecr.ap-northeast-1.amazonaws.com/repo-ibc-demo-ethereum-cosmos:latest
docker push 594175341170.dkr.ecr.ap-northeast-1.amazonaws.com/tutorial/ibc-demo-eth-cosmos:latest
```

### 3.AWS ECS内のDocker環境へアクセス

1. SSMでEC2のインスタンスへアクセス

2. Dokcerのイメージが動いていることを確認

    ```bash
    docker ps

    CONTAINER ID   IMAGE                   COMMAND               CREATED          STATUS          PORTS     NAMES
    fa8ca71e372e   59400000.dkr.e1...      "tail -f /dev/null"   7 minutes ago    Up 7 minutes              ecs-BackendResourceSt...
    711d300a9c89   amazon/amazo...         "/pause"              7 minutes ago    Up 7 minutes              ecs-BackendResourceSt...
    6d1aff9bced0   amazon/amazo...         "/agent"              33 minutes ago   Up 33 minutes             ecs-agent
    ```

3. Dockerコンテナ内でコマンドを実行

```bash
docker exec -it <container-id> /bin/bash

#例
docker exec -it fa8ca71e372e /bin/bash
```

### 4.コンテナ内でのDocker起動

```bash
apt get-install sudo
sudo dockerd
```

### 5.Intel SGXのセットアップ

```bash
curl -LO https://download.01.org/intel-sgx/sgx-linux/2.19/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.19.100.3.bin
chmod +x ./sgx_linux_x64_sdk_2.19.100.3.bin
echo -e 'no\n/opt' | ./sgx_linux_x64_sdk_2.19.100.3.bin

```

## メモ

* AWS ECSのコンテナをプライベートサブネットで動かす

# 参考資料

* [【AWS】M2 macでECSにデプロイしようとしたら、こけてしまう話](https://note.com/ryuone/n/nfae3cc204880)
* [ECS FargateにSSMを利用してSSH接続する(チュートリアル)](https://qiita.com/koji0705/items/005ea6d7c21ddd24ebb3)