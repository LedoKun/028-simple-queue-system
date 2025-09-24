#!/bin/bash
export PIP_BREAK_SYSTEM_PACKAGES="true"
export UV_BREAK_SYSTEM_PACKAGES="true"
export UV_SYSTEM_PYTHON="true"
export PIP_ROOT_USER_ACTION="ignore"
export PIP_USER="true"
export RUST_LOG="debug"

apt-get update
apt-get dist-upgrade -y
apt-get install -y ffmpeg curl

# Install Python Dependencies
curl -LsSf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
uv pip install --upgrade -r ./requirements.txt
