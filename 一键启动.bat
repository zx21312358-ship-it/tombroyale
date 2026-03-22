@echo off
chcp 65001 >nul
echo ========================================
echo    TombRoyale - 摸金战场 快速启动
echo ========================================
echo.

REM 检查 node_modules 是否存在
if not exist "node_modules" (
    echo [1/3] 检测到未安装依赖，正在安装...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败！
        pause
        exit /b 1
    )
    echo.
    echo [完成] 依赖安装完成！
    echo.
)

echo [1/2] 启动开发服务器...
start http://localhost:5173
echo.
echo 浏览器将自动打开游戏页面
echo.
echo 游戏控制:
echo   - WASD: 移动
echo   - Shift: 冲刺
echo   - Space: 跳跃
echo   - 鼠标左键：射击
echo   - 鼠标右键：瞄准
echo   - R: 换弹
echo   - 1/2/3: 切换武器
echo.
echo 按 Ctrl+C 可停止服务器
echo.

call npm run dev

pause
