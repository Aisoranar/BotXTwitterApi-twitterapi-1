const twitterApi = require('./twitterApi');
const logger     = require('../utils/logger');

// Obtener información del usuario
async function viewUser(username) {
  try {
    const data = await twitterApi.getUser(username);
    return `👤 <b>@${data.userName}</b>\n` +
           `📝 ${data.description || 'Sin descripción.'}\n` +
           `👥 Seguidores: ${data.followers ?? 0}\n` +
           `🔗 <a href="${data.url || '#'}">${data.url || '—'}</a>`;
  } catch (err) {
    logger.error(`Error consultando usuario @${username}: ${err.message}`);
    throw new Error('❌ No se pudo obtener la información del usuario.');
  }
}

// Obtener el último tweet
async function lastTweet(username) {
  try {
    const tweet = await twitterApi.getLastTweet(username);
    if (!tweet) return `@${username} no tiene tweets aún.`;
    return `📝 Último tweet de @${username}:\n${tweet.text}\n` +
           `🔗 <a href="${tweet.url}">${tweet.url}</a>`;
  } catch (err) {
    logger.error(`Error obteniendo último tweet de @${username}: ${err.message}`);
    throw new Error('❌ No se pudo obtener el último tweet.');
  }
}

// Obtener menciones
async function mentions(username) {
  try {
    const mentions = await twitterApi.getMentions(username);
    if (!mentions.length) return `📣 No hay menciones recientes para @${username}.`;
    return mentions
      .map(m => `• ${m.text || '[sin texto]'} — <a href="${m.url}">${m.url}</a>`)
      .join('\n\n');
  } catch (err) {
    logger.error(`Error consultando menciones de @${username}: ${err.message}`);
    throw new Error('❌ No se pudieron obtener las menciones.');
  }
}

// Obtener respuestas
async function replies(username) {
  try {
    const last = await twitterApi.getLastTweet(username);
    if (!last) return `💬 @${username} no tiene tweets aún.`;

    const replies = await twitterApi.getTweetReplies(last.id);
    if (!replies.length) {
      return `💬 No hay respuestas al último tweet de @${username}.`;
    }

    return replies
      .map(r => `↪️ ${r.text || '[sin texto]'} — <a href="${r.url}">${r.url}</a>`)
      .join('\n\n');
  } catch (err) {
    logger.error(`Error obteniendo respuestas de @${username}: ${err.message}`);
    throw new Error('❌ No se pudieron obtener las respuestas.');
  }
}

// Obtener retweets
async function retweets(username) {
  try {
    const last = await twitterApi.getLastTweet(username);
    if (!last) return `🔁 @${username} no tiene tweets aún.`;

    const retweeters = await twitterApi.getTweetRetweeters(last.id);
    if (!retweeters.length) {
      return `🔁 No hay retweets del último tweet de @${username}.`;
    }

    return retweeters
      .map(r => `🔁 ${r.text || '[sin texto]'} — <a href="${r.url}">${r.url}</a>`)
      .join('\n\n');
  } catch (err) {
    logger.error(`Error obteniendo retweets de @${username}: ${err.message}`);
    throw new Error('❌ No se pudieron obtener los retweets.');
  }
}

// Exportar funciones
module.exports = {
  viewUser,
  lastTweet,
  mentions,
  replies,
  retweets
};
