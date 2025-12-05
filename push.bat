@echo off
echo ===============================
echo   KENYAN STYLE BEATS DEPLOY
echo ===============================
echo.

:: Go to your project folder
cd /d "C:\Users\TMK MEDIA SERVICES\beatsstore"

echo Adding files...
git add .

echo Creating commit...
git commit -m "auto deploy"

echo Pushing to GitHub...
git push

echo.
echo ===============================
echo   DEPLOY COMPLETE!
echo   Check Vercel dashboard 🙂
echo ===============================
pause
