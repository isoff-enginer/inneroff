# Guía de Fotografías de Productos - Reserva Operaciones

Para que las fotografías de los productos se muestren automáticamente en la aplicación (en el inventario, catálogo, reportes y despachos), colócalas en este directorio:

```
public/products/
```

Cualquier archivo colocado en esta carpeta es servido estáticamente por la aplicación en la raíz `/products/`.

---

## 1. Nombres exactos de los archivos de imagen

Nombra las imágenes en formato `.png`, `.jpg` o `.webp` (preferiblemente `.png` con fondo transparente o fondo blanco limpio y relación de aspecto cuadrada 1:1, resolución recomendada 500x500 px):

| Grupo | Producto | Nombre de archivo sugerido | Ruta servida |
| :--- | :--- | :--- | :--- |
| **Blanco** | Mamitas | `mamitas.png` | `/products/mamitas.png` |
| **Blanco** | Tornillo | `tornillo.png` | `/products/tornillo.png` |
| **Verde** | Lisos | `lisos.png` | `/products/lisos.png` |
| **Verde** | Largos | `largos.png` | `/products/largos.png` |
| **Verde** | Minis | `minis.png` | `/products/minis.png` |
| **Productos adicionales** | Baldes rojas (Rojas) | `rojas.png` | `/products/rojas.png` |
| **Productos adicionales** | Flores | `flores.png` | `/products/flores.png` |
| **Productos adicionales** | Baldes | `baldes.png` | `/products/baldes.png` |
| **Productos adicionales** | Pre-roll | `pre-roll.png` | `/products/pre-roll.png` |

---

## 2. Cómo se asocia cada fotografía con su producto

1. **Automático por nombre:** El componente `ProductVisualIcon` detecta automáticamente el nombre del producto y busca su correspondiente imagen en `/products/<slug>.png`. Si la imagen está en la carpeta, la carga de inmediato. Si aún no has subido la imagen, la aplicación muestra automáticamente un icono minimalista de alta resolución como respaldo.
2. **Personalizado por URL:** También puedes definir una URL personalizada (`imageUrl`) o almacenar las imágenes en un bucket de almacenamiento de Supabase (`product_images`) y asignarla en el campo de descripción o datos del producto.

