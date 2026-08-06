#!/bin/bash
set -euo pipefail
cd /mnt/c/Users/HP/Documents/remitrelief/remitrelief-backend/src/contracts/escrow-contract
echo "PWD=$(pwd)"
if ! command -v rustup >/dev/null 2>&1; then
  echo "rustup not found, installing..."
  curl https://sh.rustup.rs -sSf | sh -s -- -y
  source $HOME/.cargo/env
fi
rustup --version
rustup target add wasm32-unknown-unknown
cargo build --release --target wasm32-unknown-unknown
echo "BUILD_DONE"
