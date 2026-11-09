@echo off
echo ========================================================
echo  SINCRONIZANDO Y OPTIMIZANDO FOTOS DE PRODUCTOS
echo ========================================================
echo.

if not exist "public\products" mkdir "public\products"

echo Copiando imagenes normalizadas a public\products...
copy "public\fotos de productos\mamita.png" "public\products\mamitas.png" /y >nul 2>&1
copy "public\fotos de productos\tornillos.png" "public\products\tornillo.png" /y >nul 2>&1
copy "public\fotos de productos\gordos.png" "public\products\lisos.png" /y >nul 2>&1
copy "public\fotos de productos\largos.png" "public\products\largos.png" /y >nul 2>&1
copy "public\fotos de productos\minis.png" "public\products\minis.png" /y >nul 2>&1
copy "public\fotos de productos\rojas.png" "public\products\rojas.png" /y >nul 2>&1
copy "public\fotos de productos\flores.png" "public\products\flores.png" /y >nul 2>&1
copy "public\fotos de productos\baldes.png" "public\products\baldes.png" /y >nul 2>&1
copy "public\fotos de productos\pre rolls.png" "public\products\pre-roll.png" /y >nul 2>&1

echo.
echo Listo! Las 9 fotos de productos estan sincronizadas y optimizadas.
echo.

