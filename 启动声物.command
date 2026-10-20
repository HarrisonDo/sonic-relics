#!/bin/zsh
set -eu
set -o pipefail

cd -- "${0:A:h}"

# Reuse this project's running server instead of occupying another port.
if curl --fail --silent --max-time 2 http://127.0.0.1:5173/ | grep -Fq '声物 SONIC RELICS'; then
  open http://127.0.0.1:5173/
  exit 0
fi

if ! command -v node >/dev/null || ! command -v npm >/dev/null; then
  print '请先安装 Node.js 22.12 或更新版本，再双击启动。'
  read -r '?按回车退出。'
  exit 1
fi

if [[ ! -x node_modules/.bin/vite ]]; then
  print '首次运行，正在安装项目依赖……'
  if ! npm ci; then
    print '依赖安装失败，请查看上方错误。'
    read -r '?按回车退出。'
    exit 1
  fi
fi

print '正在启动声物。请保留此终端窗口；按 Control+C 停止服务。'
if ! npm start -- --open; then
  print '启动失败，请查看上方错误。若 5173 端口被占用，请先关闭占用它的服务。'
  read -r '?按回车退出。'
  exit 1
fi
