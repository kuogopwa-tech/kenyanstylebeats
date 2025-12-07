@echo off
echo === Pushing to GitHub ===
echo.

REM Check for git
git --version >nul 2>nul
if errorlevel 1 (
    echo Error: Git is not installed!
    echo Download from: https://git-scm.com
    pause
    exit
)

REM Initialize git if not already
if not exist ".git" (
    echo Initializing git repository...
    git init
)

REM Add all files
echo Adding files...
git add .

REM Commit
echo Committing changes...
git commit -m "Update: %date% %time%"

REM Ask for remote URL
set /p GIT_URL="Enter GitHub repo URL (or press Enter to skip): "

if not "%GIT_URL%"=="" (
    echo Adding remote...
    git remote remove origin 2>nul
    git remote add origin "%GIT_URL%"
    
    echo Pushing to GitHub...
    git push -u origin main
    
    if errorlevel 1 (
        echo Trying master branch...
        git branch -M master
        git push -u origin master
    )
)

echo.
echo === Done ===
pause