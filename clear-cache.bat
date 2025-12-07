@echo off
echo Clearing Vercel cache...
echo.

REM Delete Vercel build cache
rmdir /s /q .vercel 2>nul
rmdir /s /q .next 2>nul

REM Delete node_modules to force fresh install
rmdir /s /q node_modules 2>nul

REM Clear package-lock if exists
del package-lock.json 2>nul
del yarn.lock 2>nul

echo Cache cleared!
echo Run: vercel --force to deploy fresh
pause