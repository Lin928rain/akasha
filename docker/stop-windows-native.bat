@echo off
REM Akasha 项目 Windows 本地 nginx 停止脚本

setlocal enabledelayedexpansion

REM ================= 配置区域 =================
REM nginx 安装路径
set NGINX_PATH=C:\nginx
REM ===========================================

echo ========================================
echo   Akasha 项目停止服务
echo ========================================
echo.

REM 检查 nginx 是否存在
if not exist "%NGINX_PATH%\nginx.exe" (
    echo [错误] 未找到 nginx，请检查 NGINX_PATH 配置
    pause
    exit /b 1
)

REM 停止 nginx
echo [信息] 停止 nginx...
cd /d "%NGINX_PATH%"
nginx -s stop
if %errorlevel% neq 0 (
    echo [警告] nginx 可能未运行
) else (
    echo [完成] nginx 已停止
)
echo.

echo ========================================
echo   服务已停止
echo ========================================
echo.
echo 请手动关闭前端和后端窗口
echo.
pause
