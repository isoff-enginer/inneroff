# Operation Nexus

PROMPT INICIAL — CREAR LA BASE FRONTEND DE LA PWA

Quiero que construyas la base frontend inicial de una aplicación empresarial PWA.

IMPORTANTE: en esta primera etapa NO quiero que construyas todavía toda la lógica de negocio.

Quiero crear primero la estructura visual y técnica sobre la cual posteriormente conectaremos toda la funcionalidad de Supabase.

STACK

React

TypeScript

Vite si es compatible con el proyecto

Supabase

PWA

Responsive

Mobile-first

GitHub

La aplicación será posteriormente mantenida y ampliada utilizando Antigravity.

CONCEPTO DE LA APLICACIÓN

Es una plataforma empresarial interna para administrar operaciones entre:

FÁBRICA → BODEGA → TIENDAS

La aplicación tendrá posteriormente:

autenticación

usuarios

roles

dashboard

fábrica

bodegas

tiendas

inventario

despachos

recepción de despachos

ventas/recaudos

notificaciones

Push Notifications

mensajería interna

Realtime

auditoría

administración

Pero en esta etapa quiero principalmente construir la base del frontend.

OBJETIVO DE ESTA PRIMERA ETAPA

Crear:

1. ESTRUCTURA DE LA APP

Preparar una arquitectura limpia y escalable.

Separar correctamente:

layouts

páginas

componentes

hooks

servicios

utilidades

tipos

configuración

features

Evitar poner toda la aplicación dentro de un único archivo.

2. LAYOUT PRINCIPAL

Crear un App Shell profesional.

Desktop:

┌─────────────────────────────────────────────┐
│ Header                                      │
├──────────────┬──────────────────────────────┤
│              │                              │
│ Sidebar      │       Main Content           │
│              │                              │
│              │                              │
└──────────────┴──────────────────────────────┘


Mobile:

┌──────────────────────┐
│ Header               │
├──────────────────────┤
│                      │
│ Main Content         │
│                      │
│                      │
├──────────────────────┤
│ Bottom Navigation    │
└──────────────────────┘


La navegación debe ser responsive.

3. DISEÑO VISUAL

Quiero una interfaz empresarial moderna de 2026.

Inspiración conceptual:

Stripe

Linear

Notion

Apple HIG

Características:

minimalista

elegante

profesional

limpia

rápida

excelente spacing

tipografía clara

jerarquía visual fuerte

bordes sutiles

componentes consistentes

responsive

Color principal:

#0B0F1A


Utilizarlo de forma elegante.

No llenar la interfaz de colores.

No utilizar gradientes innecesarios.

No hacer un dashboard genérico de plantilla.

4. COMPONENTES BASE

Crear un sistema de componentes reutilizable.

Preparar componentes como:

Button

Input

Select

Modal

Drawer

Card

Badge

Table

DataTable

Tabs

Dropdown

Toast

Dialog

EmptyState

LoadingState

ErrorState

SearchBar

PageHeader

StatCard

Avatar

NotificationItem

Utilizar los componentes existentes del proyecto si ya existen.

NO duplicarlos.

5. RUTAS BASE

Preparar la arquitectura para rutas como:

/login

/
/dashboard

/inventory
/dispatches
/sales
/notifications
/messages
/profile
/settings


Y posteriormente:

/factory
/warehouse
/store
/admin


No asumir todavía que todas las rutas tienen lógica funcional.

Crear la estructura para poder implementarlas posteriormente.

6. DASHBOARD INICIAL

Crear un Dashboard visual inicial.

NO conectarlo todavía a toda la lógica empresarial.

Utilizar datos mock únicamente donde sea necesario para visualizar la interfaz.

El dashboard debe mostrar una estructura similar a:

Buenos días

Resumen de operación

[ Ventas ] [ Inventario ] [ Despachos ] [ Alertas ]

Actividad reciente

Despachos recientes

Notificaciones


IMPORTANTE:

Los datos mock deben estar claramente separados de la futura fuente Supabase.

No mezclar mocks con servicios reales.

7. LOGIN

Crear la pantalla visual de Login.

Debe sentirse profesional y empresarial.

Prepararla para posteriormente conectar:

Supabase Auth

No crear un sistema de autenticación propio.

No guardar contraseñas manualmente.

No implementar autenticación falsa.

La pantalla solamente debe quedar preparada para la integración real.

8. NOTIFICACIONES

Crear la estructura visual para:

Centro de notificaciones

Debe soportar posteriormente:

no leídas

leídas

tipos

fecha

referencia

abrir evento

Ejemplo:

Notificaciones

● Fábrica despachó a Bodega Principal
  Hace 2 minutos

● Bodega recibió despacho #3
  Hace 10 minutos

● Nuevo recaudo registrado
  Hace 20 minutos

● Nuevo mensaje
  Hace 30 minutos


No implementar todavía toda la infraestructura Push.

Eso será conectado posteriormente.

9. MENSAJERÍA

Crear únicamente la estructura visual inicial.

Debe contemplar:

Conversaciones
────────────────

Usuario 1
Último mensaje

Usuario 2
Último mensaje


Y:

┌────────────────────────────┐
│ Usuario                    │
├────────────────────────────┤
│                            │
│ Mensajes                   │
│                            │
├────────────────────────────┤
│ Escribir mensaje...     ➤  │
└────────────────────────────┘


La lógica real de cifrado, mensajes y Realtime será implementada posteriormente.

NO inventar el sistema de cifrado.

10. INVENTARIO

Crear la estructura visual para:

Inventario

Buscar producto

Producto | Categoría | Ubicación | Cantidad | Valor


Preparar filtros por:

fábrica

bodega

tienda

categoría

producto

La información real será conectada posteriormente a Supabase.

11. DESPACHOS

Crear estructura visual para:

Despachos

[ + Nuevo despacho ]

#003
Fábrica Prueba
↓
Bodega Principal

Estado: Despachado
Valor: $1.000.000

Fecha


También preparar:

lista

filtros

detalle

estado

origen

destino

productos

cantidades

No duplicar la lógica de register_factory_dispatch().

12. VENTAS / RECAUDOS

Crear estructura visual para:

Ventas / Recaudos

Total recaudado

Fecha | Tienda | Operador | Categoría | Monto | Estado


Preparar la interfaz para conectar posteriormente:

payments
sales


La lógica real será implementada posteriormente.

13. ROLES

La aplicación posteriormente tendrá diferentes experiencias según el rol.

Preparar el frontend para:

boss
boss_admin
operador
operador administrativo
fábrica
bodega
tienda


IMPORTANTE:

No inventar permisos.

Los permisos reales deberán venir de Supabase/RLS.

El frontend solamente debe utilizar el rol para controlar la experiencia visual.

La seguridad real estará en Supabase.

14. SUPABASE

Si el proyecto ya está conectado a Supabase:

NO reemplazar la configuración.

NO crear otro cliente.

NO modificar tablas existentes.

NO crear tablas nuevas en esta etapa.

NO modificar RLS.

NO modificar funciones.

NO modificar Edge Functions.

La base de datos existente es la fuente de verdad.

15. PWA

Preparar correctamente la aplicación para funcionar como PWA.

Revisar primero si ya existe configuración PWA.

Si existe:

REUTILIZARLA.

Si no existe:

crear una configuración limpia.

Preparar:

manifest

iconos

Service Worker

instalación

Pero NO implementar todavía toda la lógica de Web Push.

16. RESPONSIVE

La aplicación debe funcionar correctamente en:

desktop

laptop

tablet

móvil

No simplemente reducir el tamaño de la versión desktop.

Crear layouts específicos cuando sea necesario.

17. ACCESIBILIDAD

Utilizar:

labels

botones accesibles

navegación por teclado

contraste adecuado

estados de focus

aria-label cuando corresponda

18. ARQUITECTURA

La estructura debe quedar preparada para crecer.

Una estructura posible:

src/

app/
components/
features/
  auth/
  dashboard/
  inventory/
  dispatches/
  sales/
  notifications/
  messages/
  users/
layouts/
hooks/
lib/
services/
types/
utils/


Adaptarla a la arquitectura real del proyecto.

No crear carpetas innecesarias si el framework ya tiene una estructura equivalente.

19. REGLAS IMPORTANTES

NO:

crear backend paralelo

crear autenticación propia

crear tablas nuevas

crear RLS nuevo

modificar funciones SQL

crear Edge Functions

duplicar Supabase client

inventar permisos

inventar roles

inventar datos reales

exponer secretos

poner Service Role Key en frontend

poner VAPID Private Key en frontend

20. PREPARACIÓN PARA ANTIGRAVITY

El proyecto será posteriormente continuado en Antigravity.

Por eso quiero:

código limpio

TypeScript

componentes reutilizables

arquitectura modular

nombres claros

sin código innecesario

sin lógica duplicada

sin dependencias innecesarias

No generar una implementación desechable.

21. ORDEN DE TRABAJO

Primero:

inspeccionar proyecto

revisar estructura existente

revisar Supabase

revisar PWA

revisar dependencias

Después:

crear/organizar arquitectura frontend

crear App Shell

crear Login

crear Dashboard base

crear navegación

crear componentes base

crear placeholders de módulos

NO implementar todavía toda la lógica empresarial.

22. RESULTADO ESPERADO

Al finalizar esta etapa quiero poder abrir la aplicación y tener una base visual funcional:

Login
 ↓
App
 ↓
Dashboard
 ↓
Sidebar / navegación
 ↓
Inventario
Despachos
Ventas
Notificaciones
Mensajes
Configuración


Aunque algunos módulos todavía sean placeholders.

La aplicación debe verse como un producto real desde el primer momento.

23. IMPORTANTE

No intentes terminar toda la aplicación en esta primera ejecución.

Primero construye una base frontend sólida, limpia y profesional.

Cuando termines:

dime qué archivos creaste

dime qué archivos modificaste

dime qué dependencias agregaste

dime qué parte de Supabase detectaste

dime qué parte de PWA quedó preparada

dime qué falta

Y DETENTE.

Después te proporcionaré el prompt maestro completo para comenzar la implementación funcional.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://inneroff.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c4d943bc-84ce-4a60-8dfb-51c7f8945df8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
