@echo off
chcp 65001 >nul
echo ========================================
echo    TombRoyale - 摸金战场 启动器
echo ========================================
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [1/2] 检测到未安装依赖，正在安装...
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
    echo.
)

echo [1/2] 启动开发服务器...
echo.
echo 浏览器会自动打开 http://localhost:5173
echo 按 Ctrl+C 可停止服务器
echo.

REM 启动开发服务器
call npm run dev

pause
