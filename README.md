# ibcdemo-lcp-eth_cosmos

IBC（LCP）を用いたCosmos&lt;>Ethereumのブリッジのデモ

## 構築手順

### 1. テスト用サーバーの構築

UbuntuのサーバーはAzureで構築する

#### 1-1. Azure VMで最低限必要なリソースを構築する

下記設定にて、AzureポータルよりVeirtual Machineを構築

* イメージ：Ubuntu Server 22.04 LTS
* リージョン：East US
* 可用性ゾーン：3
* サイズ：Standard DC2s v2

#### 1-2. SSH接続用の鍵を格納する

※以降の説明では、[98_key](./98_key/)へ格納した前提で記載

#### 1-3. サーバーへSSH接続する

ターミナルやPowershellで、上記1-1で構築したサーバーへSSH接続する </br>
※鍵ファイルの名称、接続先のパブリックアドレスは自身で設定したものに置き換える

```bash
ssh -i ./98_key/{鍵の名称}.pem azureuser@{パブリックアドレス}
```

### 2. デモ用サーバーのセットアップ

#### 2-1. RustやGoなどの必要言語をインストールする（この時点でAMIにしてバックアップする）

※ "/home/azureuser" 配下で実行

```bash
# ライブラリ類のインストール
apt-get update && apt-get upgrade -y
apt-get install -y libssl-dev make clang pkg-config libcurl4-openssl-dev libprotobuf-dev

# Goのインストール（1.18以上が必要）
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo "export PATH=$PATH:/usr/local/go/bin" >> ~/.profile
source ~/.profile
sudo apt-get update
sudo apt-get install build-essential

# RustとCargoのインストール
curl https://sh.rustup.rs -sSf | sh -s -- -y
. "$HOME/.cargo/env"
rustup update
# rustup install nightly-2024-09-05
```

Dockerをインストールする

```bash
wget -qO- https://get.docker.com | sh
apt install docker-compose
sudo groupadd docker
sudo usermod -aG docker $USER
```

※試した際の各言語のバージョン

```bash
go version
> go version go1.21.0 linux/amd64

rustc --version
> rustc 1.82.0 (f6e511eec 2024-10-15)

cargo --version
> cargo 1.82.0 (8f40fc59f 2024-08-21)

docker version
> Client: Docker Engine - Community
> Version:           27.3.1
> API version:       1.47
> Go version:        go1.22.7
...

docker-compose version
> docker-compose version 1.29.2, build unknown
> docker-py version: 5.0.3
> CPython version: 3.10.12
> OpenSSL version: OpenSSL 3.0.2 15 Mar 2022
```

#### 2-2. Intel SGX SDKをセットアップする

```bash
curl -LO https://download.01.org/intel-sgx/sgx-linux/2.23/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.23.100.2.bin
chmod +x ./sgx_linux_x64_sdk_2.23.100.2.bin
echo -e 'no\n/opt' | ./sgx_linux_x64_sdk_2.23.100.2.bin
source /opt/sgxsdk/environment
```

#### 2-3. Datachain提供のデモを動かしてみる

```bash
# デモ用リポジトリのクローン
git clone https://github.com/datachainlab/cosmos-ethereum-ibc-lcp.git
cd cosmos-ethereum-ibc-lcp
git clone https://github.com/datachainlab/lcp.git
cd lcp
rm -rf .git
cd ..

# ビルド＆テスト
export SGX_MODE=SW
make yrly prepare-contracts build-images
make e2e-test
```

### 2-4. 上記、EC2にてEthereum、Tendermint、LCPノードをセットアップする

送金元チェーン（Tendermint）をローカル構築

```bash
make -C ./tests/e2e/chains/tendermint image
```

送金先チェーン（Ethreum）をセットアップするあたりに一部ソースコードを変更

①　[./tests/e2e/chains/ethereum/Dockerfile.deposit](https://github.com/datachainlab/cosmos-ethereum-ibc-lcp/blob/main/tests/e2e/chains/ethereum/Dockerfile.deposit)

1行目、node.jsのバージョンをv18へ変更（node:16-alpine3.17 -> node:18-alpine）

```Dockerfile
FROM node:18-alpine

WORKDIR /app
...
```

② [./tests/e2e/chains/ethereum/Makefile](https://github.com/datachainlab/cosmos-ethereum-ibc-lcp/blob/main/tests/e2e/chains/ethereum/Makefile)

125~127行目、Harhatのインストールコマンドを追加（これがないとHardhatのバージョン不整合エラーが発生する）

```Makefile
...
.PHONY:deploy
deploy:
    $(DOCKER_COMPOSE) run -e USE_UPGRADE_TEST=$(USE_UPGRADE_TEST) contracts npm install@2.13.0
    $(DOCKER_COMPOSE) run -e USE_UPGRADE_TEST=$(USE_UPGRADE_TEST) contracts $(HARDHAT) run ./scripts/deploy.js --network eth_local
...
```

送金先チェーン（Ethreum）をローカル構築

```bash
make -C ./tests/e2e/cases/tm2eth network
```

Enclave用の鍵ペアを作成

```bash
./lcp/bin/lcp  --log_level=off enclave generate-key --enclave=./bin/enclave.signed.so
```

## 参考資料

* [【AWS】M2 macでECSにデプロイしようとしたら、こけてしまう話](https://note.com/ryuone/n/nfae3cc204880)
* [ECS FargateにSSMを利用してSSH接続する(チュートリアル)](https://qiita.com/koji0705/items/005ea6d7c21ddd24ebb3)