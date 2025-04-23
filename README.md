# Bot X Tracker

Telegram bot que permite:

- Agregar/Eliminar cuentas de X (antes Twitter).
- Seguir cuentas en tiempo real (polling cada 30s).
- Gestión de planes (basic 10 / intermediate 20 / pro 50 / premium 100 cuentas).

## Setup

1. Clona el repositorio.
2. Crea un archivo `.env` con tus credenciales:
   TWITTER_API_KEY=tu_api_key
   TELEGRAM_BOT_TOKEN=tu_token
   
# Bot X Tracker

Bot de Telegram que permite interactuar en tiempo real con la API de Twitter (X) utilizando KaitoTwitterAPI. Incluye gestión de cuentas, seguimiento en tiempo real, búsqueda avanzada y planes escalables.

## Funcionalidades principales

- Agregar o eliminar cuentas de X (antes Twitter).
- Seguir cuentas en tiempo real utilizando Webhook/WebSocket (actualización inmediata).
- Buscar contenido por palabra clave, hashtag o nombre de usuario.
- Ver tweets recientes de una cuenta.
- Ver menciones recientes.
- Ver lista de seguidores.
- Gestión de planes por usuario:
  - `basic`: hasta 10 cuentas.
  - `intermediate`: hasta 20 cuentas.
  - `pro`: hasta 50 cuentas.
  - `premium`: hasta 100 cuentas.
- Botón interactivo para menús y navegación (Telegram Inline Keyboard).
