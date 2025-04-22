// D:\Documents\GitHub\BotXTwitterApi-twitterapi\config\index.js
require('dotenv').config();

module.exports = {
  API_KEY:        process.env.TWITTER_API_KEY,
  BASE_URL:       'https://api.twitterapi.io',
  TELEGRAM_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  // Ya no usamos polling; mantenemos por compatibilidad
  POLL_INTERVAL_MS: 30_000,
  // Puerto en el que escucha Express para los webhooks
  WEBHOOK_PORT:   process.env.WEBHOOK_PORT || 3000,
  // ChatId donde reenviamos los tweets filtrados
  WEBHOOK_CHAT_ID: process.env.WEBHOOK_CHAT_ID || -1002513153868,
  PLANS: {
    basic:        10,
    intermediate: 20,
    pro:          50,
    premium:     100
  }
};
