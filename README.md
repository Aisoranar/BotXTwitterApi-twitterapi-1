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
   
# BotXTwitterApi-twitterapi

Bot de Telegram para seguir cuentas de X en tiempo real utilizando KaitoTwitterAPI.

## Carpeta de archivos

- **config/**: Configuración de API y constantes.
- **db/**: Base de datos local JSON y módulo de acceso.
- **services/**: Integración con KaitoTwitterAPI y lógica de seguimiento.
- **views/**: Plantillas de menús y mensajes para Telegram.
- **app.js**: Orquestador principal del bot.
- **package.json**: Dependencias del proyecto.