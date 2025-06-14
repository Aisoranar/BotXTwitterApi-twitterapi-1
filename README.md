# 🚀 Twitter Monitor Bot with Telegram 🤖

![Node.js Version](https://img.shields.io/badge/Node.js-18.x+-green)
![Telegram Bot API](https://img.shields.io/badge/Telegram%20Bot-API-blue)
![Twitter API](https://img.shields.io/badge/Twitter-API%20v2-lightblue)
![License](https://img.shields.io/badge/License-MIT-yellow)

Un sistema avanzado para monitorear cuentas de Twitter y recibir notificaciones en Telegram en tiempo real, con análisis de métricas y gestión de múltiples cuentas.

## 🌟 Características Principales

### 🔍 Monitoreo Avanzado
- Verificación de cuentas cada 45 segundos
- Detección de nuevos tweets y retweets
- Filtros configurables (tweets, retweets, menciones)

### 📊 Métricas Detalladas
- Seguimiento de likes, retweets y respuestas
- Estadísticas de eficiencia del sistema
- Monitoreo de salud de la API

### 🤖 Interacción con Telegram
- Menú interactivo con botones
- Comandos personalizados (/add, /stats, /logs)
- Notificaciones en tiempo real

### 🛠 Sistema Profesional
- Logging detallado con niveles de severidad
- Base de datos persistente (JSON)
- Reintentos automáticos ante errores

## 📦 Requisitos Técnicos

```bash
Node.js 18.x+
npm 9.x+ o yarn 1.22+
Cuenta de Twitter Developer
Token de bot de Telegram
🚀 Instalación Rápida
Clonar repositorio:


git clone https://github.com/tuusuario/twitter-monitor-bot.git
cd twitter-monitor-bot
Instalar dependencias:


npm install
# o
yarn install
Configurar variables:


cp config.example.js config.js
Edita config.js con tus credenciales.

Iniciar el sistema:

node app.js
⚙️ Configuración Completa
Archivo config.js
javascript
module.exports = {
  twitter: {
    apiKey: 'tu_api_key_de_twitter',
    baseUrl: 'https://api.twitterapi.io',
    timeout: 15000
  },
  telegram: {
    botToken: "tu_token_de_telegram",
    chatId: "tu_chat_id"
  },
  monitor: {
    checkIntervalMs: 45000,
    maxAccountsPerUser: 20
  }
};
Variables de Entorno (opcional)
Crea un archivo .env:

ini
TWITTER_API_KEY=tu_api_key
TELEGRAM_TOKEN=tu_token
MONITOR_INTERVAL=45000
📋 Comandos Disponibles
Comando	Descripción	Ejemplo
/start	Menú principal	-
/add @usuario	Añadir cuenta	/add elonmusk
/remove @usuario	Eliminar cuenta	/remove twitter
/stats	Estadísticas	-
/logs [n]	Ver últimos logs	/logs 20
/health	Salud del sistema	-
/test_api	Diagnóstico API	-
🖥️ Estructura del Proyecto


🛠️ Despliegue
Opción 1: Local con PM2 (Recomendado)
bash
npm install -g pm2
pm2 start app.js --name twitter-bot
pm2 save
pm2 startup

docker build -t twitter-bot .
docker run -d --name twitter-bot --restart always twitter-bot
📈 Métricas del Sistema
El bot proporciona métricas en tiempo real mediante el comando /stats:


📊 Estadísticas Detalladas

🤖 Monitor:
• Estado: 🟢 Activo
• Tiempo activo: 2h 45m
• Verificaciones: 128
• Tweets detectados: 42
• Tweets enviados: 42
• Eficiencia: 100%

🌐 Twitter API:
• Requests: 156
• Salud: ✅ Buena
🚨 Solución de Problemas
Error: "API no responde"
Verifica tu conexión a Internet

Revisa los créditos de la API Twitter

Ejecuta /test_api para diagnóstico

Error: "Bot no aparece"
Confirma el token con @BotFather

Verifica que no haya espacios en el token

Usa el enlace directo: t.me/TusTwitterNotificaciones_bot

🤝 Cómo Contribuir
Haz fork del proyecto

Crea una rama: git checkout -b mi-feature

Haz commit: git commit -am 'Nueva característica'

Haz push: git push origin mi-feature

Abre un Pull Request

### 📌 Para implementar este README:

1. Copia todo el contenido
2. Pégalo en un archivo `README.md` en la raíz de tu proyecto
3. Personaliza:
   - Reemplaza `tuusuario`, `tu_token_de_telegram`, etc. con tus datos reales
   - Añade capturas de pantalla (crea una carpeta `assets/`)
   - Actualiza las secciones de características si es necesario

¿Necesitas que ajuste alguna sección específica o añada más detalles? 😊