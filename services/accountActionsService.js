// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\accountActionsService.js
const twitterApi = require('./twitterApi');
const logger     = require('../utils/logger');

// Muestra datos básicos
async function viewUser(username) {
  try {
    const d = await twitterApi.getUser(username);
    return `👤 @${d.userName}\n📝 ${d.description||'—'}\n👥 ${d.followers||0}`;
  } catch (e) {
    logger.error(e.message);
    throw new Error('No se pudo obtener info');
  }
}

// Muestra último tweet
async function lastTweet(username) {
  try {
    const t = await twitterApi.getLastTweet(username);
    return t 
      ? `📝 @${username}: ${t.text}\n🔗 ${t.url}` 
      : `@${username} sin tweets`;
  } catch (e) {
    logger.error(e.message);
    throw new Error('No se pudo obtener último tweet');
  }
}

// Menciones
async function mentions(username) {
  try {
    const arr = await twitterApi.getMentions(username);
    return arr.length 
      ? arr.map(m=>`• ${m.text} — ${m.url}`).join('\n\n') 
      : `📣 Sin menciones @${username}`;
  } catch (e) {
    logger.error(e.message);
    throw new Error('Error menciones');
  }
}

// Respuestas al último tweet
async function replies(username) {
  try {
    const lt = await twitterApi.getLastTweet(username);
    if (!lt) return `💬 @${username} sin tweets`;
    const rs = await twitterApi.getTweetReplies(lt.id);
    return rs.length 
      ? rs.map(r=>`↪️ ${r.text} — ${r.url}`).join('\n\n') 
      : `💬 Sin respuestas`;
  } catch (e) {
    logger.error(e.message);
    throw new Error('Error replies');
  }
}

// Retweets del último tweet
async function retweets(username) {
  try {
    const lt = await twitterApi.getLastTweet(username);
    if (!lt) return `🔁 @${username} sin tweets`;
    const rs = await twitterApi.getTweetRetweeters(lt.id);
    return rs.length 
      ? rs.map(r=>`🔁 ${r.text} — ${r.url}`).join('\n\n') 
      : `🔁 Sin retweets`;
  } catch (e) {
    logger.error(e.message);
    throw new Error('Error retweets');
  }
}

module.exports = { viewUser, lastTweet, mentions, replies, retweets };
