@echo off
echo =========================================
echo  SUBIENDO CAMBIOS A LOVABLE / GITHUB
echo =========================================
echo.
echo [1/3] Anadiendo archivos modificados...
git add .
echo.
echo [2/3] Creando commit...
git commit -m "feat: eliminacion completa de chat, blindaje criptografico, rate limiting, flujo fabrica-bodega y push notifications"
echo.
echo [3/3] Subiendo a GitHub para sincronizar con Lovable...
git push
echo.
echo =========================================
echo  Cambios subidos exitosamente a Lovable!
echo =========================================
pause
