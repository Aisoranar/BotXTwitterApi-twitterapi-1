// D:\Documents\GitHub\BotXTwitterApi-twitterapi\config\index.js
require('dotenv').config();

module.exports = {
  API_KEY:        process.env.TWITTER_API_KEY,        // Clave de TwitterAPI.io
  BASE_URL:       'https://api.twitterapi.io',       // Base URL de la API
  TELEGRAM_TOKEN: process.env.TELEGRAM_BOT_TOKEN,    // Token de tu bot Telegram
  WEBHOOK_PORT:   process.env.WEBHOOK_PORT || 3000,  // Puerto para recibir webhooks HTTP
  WEBHOOK_CHAT_ID:process.env.WEBHOOK_CHAT_ID || -1002513153868, // ChatId por defecto
  PLANS: {                                           // Límites según plan
    basic:        10,
    intermediate: 20,
    pro:          50,
    premium:      100
  }
};
