@echo off
setlocal

REM --- Navigate to project folder ---
cd /d "%~dp0"

REM --- Stage all changes ---
git add .

REM --- Auto-generate commit message ---
for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set today=%%a-%%b-%%c
for /f "tokens=1-2 delims=: " %%x in ('time /t') do set now=%%x-%%y
set msg=Auto commit %today%_%now%

REM --- Commit changes ---
git commit -m "%msg%"

REM --- Push to GitHub ---
git push origin main



echo.
echo ✅ Auto-deploy complete! Commit message: %msg%
pause
