@echo off
title Publication LEVELMAK PRO sur GitHub et Vercel
echo ========================================================
echo   Envoi des mises a jour LEVELMAK PRO vers GitHub...
echo ========================================================
echo.
cd /d "%~dp0"
git push origin main
echo.
echo ========================================================
echo   Termine ! Vercel lance le deploiement automatique.
echo ========================================================
pause
