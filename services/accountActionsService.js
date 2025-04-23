// File: D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\accountActionsService.js
const twitterApi = require('./twitterApi');
const logger     = require('../utils/logger');

/**
 * Muestra datos detallados de un usuario.
 * @param {string} username
 */
async function viewUser(username) {
  try {
    const u = await twitterApi.getUser(username);
    return [
      `👤 <b>@${u.userName}</b> (${u.name})`,
      `🆔 ID: ${u.id}`,
      `📜 Bio: ${u.description || '—'}`,
      `📍 Ubicación: ${u.location || '—'}`,
      `✅ Verificado: ${u.isBlueVerified ? 'Sí' : 'No'}`,
      `👥 Seguidores: ${u.followers}`,
      `👣 Siguiendo: ${u.following}`,
      `📝 Tweets: ${u.statusesCount}`,
      `📅 Creado: ${new Date(u.createdAt).toLocaleDateString()}`
    ].join('\n');
  } catch (e) {
    logger.error(e.stack);
    throw new Error('No se pudo obtener información del usuario.');
  }
}

/**
 * Muestra los últimos 5 tweets de un usuario.
 * @param {string} username
 */
async function lastTweets(username) {
  try {
    const tweets = await twitterApi.getUserLastTweets(username, 5);
    if (!tweets.length) {
      return `📝 @${username} no tiene tweets recientes.`;
    }
    return tweets
      .map(t => `• ${t.text}\n  🔗 <a href="${t.url}">Ver en X</a>`)
      .join('\n\n');
  } catch (e) {
    logger.error(e.stack);
    throw new Error('Error al obtener los últimos tweets.');
  }
}

/**
 * Muestra las últimas 5 menciones a un usuario.
 * @param {string} username
 */
async function mentions(username) {
  try {
    const tweets = await twitterApi.getMentions(username, 5);
    if (!tweets.length) {
      return `📣 No hay menciones a @${username}.`;
    }
    return tweets
      .map(m => `• ${m.text}\n  💬 <a href="${m.url}">Ver en X</a>`)
      .join('\n\n');
  } catch (e) {
    logger.error(e.stack);
    throw new Error('Error al obtener menciones.');
  }
}

/**
 * Muestra las últimas 5 respuestas que el usuario hizo.
 * @param {string} username
 */
async function replies(username) {
  try {
    const tweets = await twitterApi.getUserReplies(username, 5);
    if (!tweets.length) {
      return `💬 @${username} no ha respondido recientemente.`;
    }
    return tweets
      .map(r => `• ${r.text}\n  🔗 <a href="${r.url}">Ver en X</a>`)
      .join('\n\n');
  } catch (e) {
    logger.error(e.stack);
    throw new Error('Error al obtener respuestas.');
  }
}

/**
 * Muestra los últimos 5 retweets que el usuario hizo.
 * @param {string} username
 */
async function retweets(username) {
  try {
    const tweets = await twitterApi.getUserRetweets(username, 5);
    if (!tweets.length) {
      return `🔁 @${username} no ha retweeteado recientemente.`;
    }
    return tweets
      .map(r => `• ${r.text}\n  🔗 <a href="${r.url}">Ver en X</a>`)
      .join('\n\n');
  } catch (e) {
    logger.error(e.stack);
    throw new Error('Error al obtener retweets.');
  }
}

module.exports = {
  viewUser,
  lastTweets,
  mentions,
  replies,
  retweets
};
