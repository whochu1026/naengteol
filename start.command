#!/bin/bash
# Finder에서 더블클릭하면 Terminal이 열리고 로컬 개발 서버가 기동됩니다.
set -euo pipefail

cd "$(dirname "$0")"

echo "========================================"
echo "  냉털 (naengteol) 로컬 실행"
echo "========================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js가 없습니다. https://nodejs.org 에서 20 이상을 설치한 뒤 다시 실행하세요."
  read -r -p "Enter 키를 누르면 종료합니다… "
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "❌ Node.js 20 이상이 필요합니다. 현재: $(node -v)"
  read -r -p "Enter 키를 누르면 종료합니다… "
  exit 1
fi

echo "✓ Node $(node -v)"

need_install=0
[ ! -d node_modules ] && need_install=1
[ ! -d backend/node_modules ] && need_install=1
[ ! -d frontend/node_modules ] && need_install=1

if [ "$need_install" -eq 1 ]; then
  echo
  echo "📦 의존성 설치 중 (처음 한 번만 시간이 걸립니다)…"
  npm install
  npm --prefix backend install
  npm --prefix frontend install
  echo "✓ 설치 완료"
fi

if [ ! -f backend/.env ] && [ -f backend/.env.example ]; then
  cp backend/.env.example backend/.env
  echo "✓ backend/.env 생성 (.env.example 복사)"
fi

echo
echo "🚀 서버 시작"
echo "   웹  http://localhost:3000"
echo "   API http://localhost:4000"
echo "   문서 http://localhost:4000/api/docs"
echo
echo "중지하려면 이 창에서 Ctrl+C"
echo "----------------------------------------"
echo

npm run dev

echo
read -r -p "서버가 종료되었습니다. Enter 키를 누르면 창을 닫습니다… "
