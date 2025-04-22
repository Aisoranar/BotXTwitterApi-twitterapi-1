// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\trackingService.js
const db             = require('../db/database');
const webhookService = require('./webhookService');
const logger         = require('../utils/logger');

/**
 * Inicia seguimiento en tiempo real para una cuenta usando Webhook/Websocket
 */
async function startTracking(bot, chatId, userId, username) {
  const user = await db.getUser(userId);
  const acc  = user.tracked.find(a => a.username === username);
  if (!acc) return;

  try {
    // 1) Crear la regla (devuelve ruleId)
    const ruleId = await webhookService.addRule(username);

    // 2) Activar la regla (is_effect = 1)
    const ok = await webhookService.updateRule(ruleId, username, true);
    if (!ok) throw new Error('No se pudo activar la regla');

    // 3) Guardar ruleId y marcar activo
    acc.ruleId = ruleId;
    acc.active = true;
    await db.updateAccount(userId, acc);

    await bot.sendMessage(
      chatId,
      `🔔 Seguimiento en tiempo real ACTIVADO para @${username}`
    );
  } catch (err) {
    logger.error(`Error al iniciar seguimiento @${username}: ${err.message}`);
    await bot.sendMessage(
      chatId,
      `⚠️ No se pudo activar el seguimiento en tiempo real para @${username}.`
    );
  }
}

/**
 * Detiene seguimiento en tiempo real para una cuenta desactivando la regla
 */
async function stopTracking(bot, chatId, userId, username) {
  const user = await db.getUser(userId);
  const acc  = user.tracked.find(a => a.username === username);
  if (!acc || !acc.ruleId) return;

  try {
    // Desactivar la regla (is_effect = 0)
    await webhookService.updateRule(acc.ruleId, username, false);

    acc.active = false;
    await db.updateAccount(userId, acc);

    await bot.sendMessage(
      chatId,
      `🛑 Seguimiento en tiempo real DETENIDO para @${username}`
    );
  } catch (err) {
    logger.error(`Error al detener seguimiento @${username}: ${err.message}`);
    await bot.sendMessage(
      chatId,
      `⚠️ No se pudo detener el seguimiento en tiempo real para @${username}.`
    );
  }
}

module.exports = { startTracking, stopTracking };
