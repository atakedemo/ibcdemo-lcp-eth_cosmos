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

#### 2-1. Intel SGX SDKをセットアップする

```bash
curl -LO https://download.01.org/intel-sgx/sgx-linux/2.19/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.19.100.3.bin
chmod +x ./sgx_linux_x64_sdk_2.19.100.3.bin
echo -e 'no\n/opt' | ./sgx_linux_x64_sdk_2.19.100.3.bin

curl -LO https://download.01.org/intel-sgx/sgx-linux/2.22/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.22.100.3.bin
chmod +x ./sgx_linux_x64_sdk_2.22.100.3.bin
echo -e 'no\n/opt' | ./sgx_linux_x64_sdk_2.22.100.3.bin

source /opt/sgxsdk/environment
```

```bash
# インストール前の下準備
set -eux
wget "https://download.01.org/intel-sgx/sgx-linux/2.22/as.ld.objdump.r4.tar.gz" --progress=dot:giga
tar -xvf as.ld.objdump.r4.tar.gz --directory /usr/local/bin/
rm -f as.ld.objdump.r4.tar.gz

# Intel SGX SDK(v2.22)のインストール
set -eux
wget -O sdk.bin "https://download.01.org/intel-sgx/sgx-linux/2.22/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.22.100.3.bin" --progress=dot:giga
chmod +x sdk.bin
echo -e "no\n/opt/intel" | ./sdk.bin
echo "source /opt/intel/sgxsdk/environment" >> /root/.bashrc
rm -f sdk.bin

# Intel SGZX PWSのインストール
cd /opt/intel/sgxsdk
set -eux
echo "deb [arch=amd64] ${url} ${distro} main"
tee /etc/apt/sources.list.d/intel-sgx.list
```

#### 2-2. RustやGoなどの必要言語をインストールする（この時点でAMIにしてバックアップする）

※ "/home/azureuser" 配下で実行

```bash
# ライブラリ類のインストール
apt-get update && apt-get upgrade -y
apt-get install -y libssl-dev make clang pkg-config libcurl4-openssl-dev libprotobuf-dev build-essential wget
rm -rf /var/lib/apt/lists/*

# Goのインストール（1.18以上が必要）
wget https://go.dev/dl/go1.21.0.linux-amd64.tar.gz
sudo tar -C /usr/local -xzf go1.21.0.linux-amd64.tar.gz
echo "export PATH=$PATH:/usr/local/go/bin" >> ~/.profile
source ~/.profile
sudo apt-get update

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

docker --version
> 

docker-compose --version
> docker-compose version 1.29.2, build unknown
```

#### 2-3. Datachain提供のデモを動かしてみる

```bash
# デモ用リポジトリのクローン
git clone https://github.com/datachainlab/cosmos-ethereum-ibc-lcp.git
cd cosmos-ethereum-ibc-lcp
git clone https://github.com/datachainlab/lcp.git
cd lcp
git checkout 4df1e8deb51f284d3c44136ff1a8c31dddc4bd90
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
* [DCsv3 サイズ シリーズ - Azure Virtual Machines | Microsoft Learn](https://learn.microsoft.com/ja-jp/azure/virtual-machines/sizes/general-purpose/dcsv3-series?tabs=sizebasic#dcdsv3-series)