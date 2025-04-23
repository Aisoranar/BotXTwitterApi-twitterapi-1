// D:\Documents\GitHub\BotXTwitterApi-twitterapi\server.js
'use strict';

const express     = require('express');
const bodyParser  = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const config      = require('./config');
const logger      = require('./utils/logger');
const db          = require('./db/database');

const bot = new TelegramBot(config.TELEGRAM_TOKEN);
const app = express();
app.use(bodyParser.json());

app.post('/webhook', async (req, res) => {
  logger.info('🔔 /webhook invocado', { headers: req.headers, body: req.body });
  try {
    const incomingKey = req.header('X-API-Key');
    if (incomingKey !== config.API_KEY) {
      logger.warn('🔒 API key inválida');
      return res.sendStatus(401);
    }
    const payload = req.body;
    if (payload.event_type !== 'tweet' || !Array.isArray(payload.tweets)) {
      logger.info('⚪ Evento no relevante');
      return res.sendStatus(200);
    }
    for (const tweet of payload.tweets) {
      const username = tweet.author.username;
      const text     = tweet.text;
      const url      = `https://twitter.com/${username}/status/${tweet.id}`;
      logger.info(`▶️ Tweet de @${username}: ${text.slice(0,50)}…`);

      const all = db.getAllUsers();
      for (const uid of Object.keys(all)) {
        const user = await db.getUser(uid);
        const acc  = user.tracked.find(a => a.username === username && a.active);
        if (!acc || !user.groupChatId) continue;
        const chatId = user.groupChatId;
        const msg = `🆕 <b>Nuevo tweet de @${username}</b>\n\n${text}\n\n🔗 <a href="${url}">Ver</a>`;
        await bot.sendMessage(chatId, msg, { parse_mode: 'HTML', disable_web_page_preview: true })
          .then(() => logger.info(`✅ Enviado a chat ${chatId}`))
          .catch(e => logger.error(`❌ Error a ${chatId}: ${e.message}`));
      }
    }
    res.status(200).json({ success: true });
  } catch (err) {
    logger.error(`💥 /webhook fallo: ${err.stack}`);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ✅ CAMBIO CLAVE PARA RENDER:
const port = process.env.PORT || config.WEBHOOK_PORT || 4000;
app.listen(port, '0.0.0.0', () =>
  logger.info(`🚀 Webhook escuchando en ${port}`)
);
