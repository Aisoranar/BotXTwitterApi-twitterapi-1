// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\trackingService.js
const db             = require('../db/database');
const webhookService = require('./webhookService');
const logger         = require('../utils/logger');

/**
 * Activa seguimiento: crea o reutiliza la regla y la enciende
 */
async function startTracking(bot, chatId, userId, username) {
  const user = await db.getUser(userId);
  const acc  = user.tracked.find(a => a.username === username);
  if (!acc) { 
    logger.warn(`Usuario ${userId} no rastrea @${username}`); 
    return; 
  }
  if (acc.active) {
    await bot.sendMessage(chatId, `🔔 @${username} ya está activo.`);
    return;
  }

  try {
    let ruleId = acc.ruleId || await webhookService.addRule(username);
    logger.info(`Regla ${ruleId} para @${username}`);
    const ok = await webhookService.updateRule(ruleId, username, true);
    if (!ok) throw new Error('activate fail');

    acc.ruleId = ruleId;
    acc.active = true;
    await db.updateAccount(userId, acc);

    await bot.sendMessage(chatId, `🔔 Seguimiento ACTIVADO para @${username}`);
  } catch (e) {
    logger.error(e.stack);
    await bot.sendMessage(chatId, `⚠️ Error al activar @${username}: ${e.message}`);
  }
}

/**
 * Desactiva seguimiento: apaga la regla
 */
async function stopTracking(bot, chatId, userId, username) {
  const user = await db.getUser(userId);
  const acc  = user.tracked.find(a => a.username === username);
  if (!acc || !acc.ruleId) {
    await bot.sendMessage(chatId, `🛑 @${username} no estaba activo.`);
    return;
  }

  try {
    const ok = await webhookService.updateRule(acc.ruleId, username, false);
    if (!ok) throw new Error('deactivate fail');

    acc.active = false;
    await db.updateAccount(userId, acc);

    await bot.sendMessage(chatId, `🛑 Seguimiento DETENIDO para @${username}`);
  } catch (e) {
    logger.error(e.stack);
    await bot.sendMessage(chatId, `⚠️ Error al detener @${username}: ${e.message}`);
  }
}

module.exports = { startTracking, stopTracking };
