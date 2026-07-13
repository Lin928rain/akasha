@echo off
REM Akasha 项目 Windows 本地 nginx 启动脚本
REM
REM 使用前请确保：
REM 1. 已安装 nginx for Windows
REM 2. 已配置 nginx 路径

setlocal enabledelayedexpansion

REM ================= 配置区域 =================
REM nginx 安装路径
set NGINX_PATH=C:\nginx

REM 项目根目录
set PROJECT_ROOT=%~dp0..

REM 前端端口
set FRONTEND_PORT=5173

REM 后端端口
set BACKEND_PORT=8787
REM ===========================================

echo ========================================
echo   Akasha 项目启动（Windows + nginx）
echo ========================================
echo.

REM 检查 nginx 是否存在
if not exist "%NGINX_PATH%\nginx.exe" (
    echo [错误] 未找到 nginx，请检查 NGINX_PATH 配置
    echo [提示] 当前配置：%NGINX_PATH%
    pause
    exit /b 1
)

echo [信息] nginx 路径：%NGINX_PATH%
echo.

REM 复制配置文件
echo [信息] 复制 nginx 配置文件...
copy /Y "%PROJECT_ROOT%\docker\nginx.windows.dev.conf" "%NGINX_PATH%\conf\nginx.conf" >nul
if %errorlevel% neq 0 (
    echo [错误] 复制配置文件失败
    pause
    exit /b 1
)
echo [完成] 配置文件已复制
echo.

REM 启动 nginx
echo [信息] 启动 nginx...
cd /d "%NGINX_PATH%"
start nginx
if %errorlevel% neq 0 (
    echo [错误] nginx 启动失败
    pause
    exit /b 1
)
echo [完成] nginx 已启动
echo.

REM 启动前端
echo [信息] 启动前端服务（端口 %FRONTEND_PORT%）...
start "Akasha Frontend" cmd /k "cd /d %PROJECT_ROOT% && npm run start"
echo.

REM 启动后端
echo [信息] 启动后端服务（端口 %BACKEND_PORT%）...
start "Akasha Backend" cmd /k "cd /d %PROJECT_ROOT% && npm run server"
echo.

echo ========================================
echo   所有服务已启动
echo ========================================
echo.
echo 访问地址：http://localhost
echo.
echo 停止服务:
echo   1. 关闭 nginx: 在 %NGINX_PATH% 目录运行 nginx -s stop
echo   2. 关闭前端和后端窗口
echo.
pause
