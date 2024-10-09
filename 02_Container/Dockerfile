# ベースイメージを指定
FROM ubuntu:22.04

# 必要なツールのインストール
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends wget curl git make binutils build-essential ca-certificates && \
    wget https://go.dev/dl/go1.22.7.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.22.7.linux-amd64.tar.gz && \
    rm go1.22.7.linux-amd64.tar.gz && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# RustとCargoのインストール
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y \
    && . "$HOME/.cargo/env" \
    && rustup update
# OpenSSLのインストール
RUN apt-get install -y libssl-dev

# 環境変数を設定
ENV PATH="/usr/local/go/bin:${PATH}:/root/.cargo/bin"

# 作業ディレクトリを設定
WORKDIR /workspace

# Install Docker & Intel SGX SDK
RUN wget -qO- https://get.docker.com | sh
RUN curl -LO https://download.01.org/intel-sgx/sgx-linux/2.19/distro/ubuntu22.04-server/sgx_linux_x64_sdk_2.19.100.3.bin && \
    chmod +x ./sgx_linux_x64_sdk_2.19.100.3.bin

# GitHubリポジトリをクローン
RUN git clone https://github.com/datachainlab/cosmos-ethereum-ibc-lcp.git && \
    cd lcp && \
    git clone https://github.com/datachainlab/lcp.git && \
    rm -rf .git

CMD ["tail", "-f", "/dev/null"]
