// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\trackingService.js

const path = require('path');
// Cargar variables de entorno desde el .env del proyecto
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const axios  = require('axios');
const db     = require('../db/database');
const logger = require('../utils/logger');
const { API_KEY, BASE_URL } = require('../config');

// Configuración de polling
const CHECK_INTERVAL     = parseInt(process.env.CHECK_INTERVAL || '300', 10); // segundos
const TIME_WINDOW_HOURS = parseFloat(process.env.TIME_WINDOW_HOURS || '1');    // horas
const checkIntervalMs   = CHECK_INTERVAL * 1000;
const timeWindowMs      = TIME_WINDOW_HOURS * 3600 * 1000;

// Mapa de intervalos activos: key = "<userId>:<username>"
const pollIntervals = {};

// Util: formatea fecha a "YYYY-MM-DD_HH:mm:ss_UTC"
function formatUtcKey(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}` +
         `_${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}_UTC`;
}

// Util: escapa HTML para Telegram
function escapeHtml(str = '') {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Formatea un tuit a HTML para Telegram
function formatTweetHtml(tweet, username) {
  const id         = tweet.id || tweet.id_str || '';
  const createdRaw = tweet.created_at || tweet.createdAt || '';
  let createdFmt   = escapeHtml(createdRaw);
  const parsed     = Date.parse(createdRaw);
  if (!isNaN(parsed)) {
    createdFmt = new Date(parsed).toUTCString().replace('GMT', 'UTC');
  }
  const text     = escapeHtml(tweet.text || '');
  const tweetUrl = id ? `https://twitter.com/${username}/status/${id}` : '';

  let msg = '';
  msg += `<b>🚀 Nuevo tweet de @${escapeHtml(username)}</b>\n`;
  msg += `<code>${createdFmt}</code>\n\n`;
  msg += `${text}\n`;
  if (tweetUrl) {
    msg += `\n🔗 <a href="${tweetUrl}">Ver en Twitter</a>`;
  }
  return msg;
}

// Lógica de polling: consulta y envía nuevos tuits
async function checkUserTweets(bot, chatId, userId, username) {
  try {
    const user = await db.getUser(userId);
    const acc  = user.tracked.find(a => a.username === username);
    if (!acc) {
      return logger.warn(`@${username} no encontrado para userId=${userId}`);
    }

    // Determinar rango de tiempo
    const lastChecked = acc.lastChecked
      ? new Date(acc.lastChecked)
      : new Date(Date.now() - timeWindowMs);
    const now = new Date();

    const since = formatUtcKey(lastChecked);
    const until = formatUtcKey(now);
    const query = `from:${username} since:${since} until:${until} include:nativeretweets`;
    const url   = `${BASE_URL}/twitter/tweet/advanced_search`;

    let tweets = [];
    let cursor = null;
    do {
      const params = { query, queryType: 'Latest' };
      if (cursor) params.cursor = cursor;
      const resp = await axios.get(url, {
        headers: { 'X-API-Key': API_KEY },
        params
      });
      tweets = tweets.concat(resp.data.tweets || []);
      cursor = resp.data.has_next_page ? resp.data.next_cursor : null;
    } while (cursor);

    if (tweets.length) {
      logger.info(`🔔 ${tweets.length} nuevos tweets de @${username}`);
      for (const tweet of tweets) {
        const html = formatTweetHtml(tweet, username);
        await bot.sendMessage(chatId, html, {
          parse_mode: 'HTML',
          disable_web_page_preview: false
        });
      }
    } else {
      logger.debug(`⏸️ No hay nuevos tweets de @${username}`);
    }

    // Actualizar timestamp en la BD
    acc.lastChecked = now.toISOString();
    await db.updateAccount(userId, acc);
  } catch (err) {
    logger.error(`Error en polling @${username}: ${err.stack}`);
  }
}

// Activa seguimiento: arranca polling periódico
async function startTracking(bot, chatId, userId, username) {
  const userData = await db.getUser(userId);
  const acc      = userData.tracked.find(a => a.username === username);
  if (!acc) {
    await bot.sendMessage(chatId, `⚠️ @${username} no está en tu lista de seguimiento.`);
    return;
  }
  if (acc.active) {
    await bot.sendMessage(chatId, `🔔 @${username} ya está activo.`);
    return;
  }

  acc.active = true;
  acc.lastChecked = acc.lastChecked || new Date(Date.now() - timeWindowMs).toISOString();
  await db.updateAccount(userId, acc);

  const key = `${userId}:${username}`;
  pollIntervals[key] = setInterval(
    () => checkUserTweets(bot, chatId, userId, username),
    checkIntervalMs
  );

  // Ejecutar inmediatamente
  await checkUserTweets(bot, chatId, userId, username);

  await bot.sendMessage(chatId, `🔔 Seguimiento ACTIVADO para @${username}`);
}

// Desactiva seguimiento: limpia el intervalo
async function stopTracking(bot, chatId, userId, username) {
  const userData = await db.getUser(userId);
  const acc      = userData.tracked.find(a => a.username === username);
  if (!acc || !acc.active) {
    await bot.sendMessage(chatId, `🛑 @${username} no estaba activo.`);
    return;
  }

  const key = `${userId}:${username}`;
  if (pollIntervals[key]) {
    clearInterval(pollIntervals[key]);
    delete pollIntervals[key];
  }

  acc.active = false;
  await db.updateAccount(userId, acc);

  await bot.sendMessage(chatId, `🛑 Seguimiento DETENIDO para @${username}`);
}

module.exports = { startTracking, stopTracking };
