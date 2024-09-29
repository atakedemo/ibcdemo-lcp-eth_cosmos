# ベースイメージを指定
FROM ubuntu:22.04

# 必要なツールのインストール
RUN apt-get update && apt-get upgrade -y && \
    apt-get install -y --no-install-recommends wget curl git make binutils build-essential ca-certificates && \
    wget https://go.dev/dl/go1.22.7.linux-amd64.tar.gz

RUN tar -C /usr/local -xzf go1.22.7.linux-amd64.tar.gz && \
    rm go1.22.7.linux-amd64.tar.gz && \
    apt-get clean && rm -rf /var/lib/apt/lists/*

# 環境変数を設定
ENV PATH="/usr/local/go/bin:${PATH}"

# 作業ディレクトリを設定
WORKDIR /workspace

# GitHubリポジトリをクローン
RUN git clone https://github.com/datachainlab/cosmos-ethereum-ibc-lcp.git

# コンテナ起動時にbashを実行する
# CMD ["/bin/bash"]
CMD ["tail", "-f", "/dev/null"]
