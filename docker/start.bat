@echo off
REM Akasha 项目一键启动脚本（Docker + nginx 方式）
#
REM 使用前请确保：
REM 1. 已安装 Docker Desktop
REM 2. 已创建 .env 文件并配置必要的环境变量

echo ========================================
echo   Akasha 项目启动（Docker + nginx）
echo ========================================
echo.

REM 检查 Docker 是否运行
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] Docker 未运行，请先启动 Docker Desktop
    pause
    exit /b 1
)

echo [信息] Docker 运行正常
echo.

REM 检查 .env 文件
if not exist "..\.env" (
    echo [警告] 未找到 .env 文件
    echo [提示] 请复制 .env.example 为 .env 并配置必要的环境变量
    echo.
)

REM 启动服务
echo [信息] 启动服务...
echo.
docker compose -f docker-compose.nginx.yml up

echo.
echo ========================================
echo   服务已停止
echo ========================================
pause
