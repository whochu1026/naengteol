@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo ========================================
echo   냉털 (naengteol) 로컬 실행
echo ========================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [X] Node.js가 없습니다. https://nodejs.org 에서 20 이상을 설치한 뒤 다시 실행하세요.
  pause
  exit /b 1
)

for /f "tokens=1 delims=." %%v in ('node -p "process.versions.node"') do set NODE_MAJOR=%%v
if not defined NODE_MAJOR (
  echo [X] Node.js 버전을 확인할 수 없습니다.
  pause
  exit /b 1
)
if %NODE_MAJOR% LSS 20 (
  echo [X] Node.js 20 이상이 필요합니다. 현재:
  node -v
  pause
  exit /b 1
)

echo [OK] Node
node -v

set NEED_INSTALL=0
if not exist "node_modules\" set NEED_INSTALL=1
if not exist "backend\node_modules\" set NEED_INSTALL=1
if not exist "frontend\node_modules\" set NEED_INSTALL=1

if "%NEED_INSTALL%"=="1" (
  echo.
  echo [..] 의존성 설치 중 ^(처음 한 번만 시간이 걸립니다^)...
  call npm install
  if errorlevel 1 goto :fail
  call npm --prefix backend install
  if errorlevel 1 goto :fail
  call npm --prefix frontend install
  if errorlevel 1 goto :fail
  echo [OK] 설치 완료
)

if not exist "backend\.env" (
  if exist "backend\.env.example" (
    copy /y "backend\.env.example" "backend\.env" >nul
    echo [OK] backend\.env 생성 ^(.env.example 복사^)
  )
)

echo.
echo [..] 서버 시작
echo     웹  http://localhost:3000
echo     API http://localhost:4000
echo     문서 http://localhost:4000/api/docs
echo.
echo 중지하려면 이 창에서 Ctrl+C
echo ----------------------------------------
echo.

call npm run dev
echo.
pause
exit /b 0

:fail
echo.
echo [X] 설치 또는 실행에 실패했습니다.
pause
exit /b 1
