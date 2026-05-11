@echo off
echo ============================================
echo   Periodicals Dashboard - Update Script
echo ============================================
echo.

cd /d "%~dp0"

echo Converting Excel to data.js...
node convert-data.js
echo Done.
echo.

echo Committing to Git...
git add .
git commit -m "Automated data refresh by update.bat"
git push
echo.
echo Done!
pause
