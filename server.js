// D:\Documents\GitHub\BotXTwitterApi-twitterapi\server.js
'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const config      = require('./config');
const logger      = require('./utils/logger');

const bot = new TelegramBot(config.TELEGRAM_TOKEN);
const app = express();

app.use(bodyParser.json());

app.post('/webhook', (req, res) => {
  try {
    const { tweet } = req.body;

    if (!tweet || !tweet.text || !tweet.author?.userName || !tweet.url) {
      logger.warn('Datos del tweet incompletos o inválidos.');
      return res.status(400).json({ error: 'Tweet inválido o incompleto' });
    }

    const username = tweet.author.userName;
    const text     = tweet.text;
    const url      = tweet.url;
    const chatId   = config.WEBHOOK_CHAT_ID;

    const message = `🆕 <b>@${username}</b>: ${text}\n🔗 <a href="${url}">${url}</a>`;

    bot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }).catch(e => logger.error('Error enviando mensaje:', e));

    res.status(200).json({ success: true });
  } catch (err) {
    logger.error('Error en webhook:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

app.listen(config.WEBHOOK_PORT, () => {
  logger.info(`✅ Webhook escuchando en el puerto ${config.WEBHOOK_PORT}`);
});
