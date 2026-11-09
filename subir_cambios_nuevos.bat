@echo off
echo =========================================
echo  FORZANDO SUBIDA DE CAMBIOS A LOVABLE
echo =========================================
echo.
echo [0/3] Sincronizando fotos de productos...
call optimizar_fotos.bat
echo.
echo [1/3] Añadiendo todos los archivos modificados...
git add .
echo.
echo [2/3] Creando el commit...
git commit -m "fix: corregir despachos bodega y fabrica, total_value generada, uuid undefined en inventario y depuracion de productos duplicados"
echo.
echo [3/3] Subiendo a GitHub para que Lovable sincronice...
git push origin main
echo.
echo Si ves este mensaje sin errores, los cambios ya llegaron a Lovable.
echo Ve a Lovable y revisa si el build ya funciona.
echo.
pause
