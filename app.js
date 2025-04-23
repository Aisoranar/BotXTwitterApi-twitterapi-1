// File: D:\Documents\GitHub\BotXTwitterApi-twitterapi\app.js
'use strict';

const TelegramBot = require('node-telegram-bot-api');
const config      = require('./config');
const db          = require('./db/database');
const trackSvc    = require('./services/trackingService');
const planSvc     = require('./services/planService');
const menu        = require('./views/telegramMenu');
const logger      = require('./utils/logger');
const acctSvc     = require('./services/accountActionsService');

const bot = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });
const states = {};

// Verifica si el usuario es admin en el chat
async function isAdmin(chatId, userId) {
  try {
    const m = await bot.getChatMember(chatId, userId);
    return ['administrator','creator'].includes(m.status);
  } catch {
    return false;
  }
}

// /start — en privado o en grupo
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const isGroup = msg.chat.type.endsWith('group');

  if (isGroup) {
    await db.setUserGroupChat(userId, chatId);
    logger.info(`▶️ Usuario ${userId} registrado en grupo ${chatId}`);
  }
  const admin = await isAdmin(chatId, userId);
  const greeting = isGroup
    ? '✅ Bot listo en este grupo—elige opción:'
    : `👋 Hola <b>${msg.from.first_name}</b>!\n¿Qué deseas hoy?`;

  await bot.sendMessage(chatId, greeting, { parse_mode: 'HTML' });
  await bot.sendMessage(chatId, 'Elige una opción:', menu.mainMenu(admin));
});

// Manejo de botones
bot.on('callback_query', async (q) => {
  const chatId = q.message.chat.id;
  const userId = q.from.id;
  const [cmd, arg] = q.data.split(':');
  const admin = await isAdmin(chatId, userId);

  try {
    switch (cmd) {
      case 'add':
        states[userId] = { state: 'AWAIT_ADD' };
        await bot.sendMessage(chatId, menu.promptUsername());
        break;

      case 'delete':
        states[userId] = { state: 'AWAIT_DELETE' };
        {
          const list = await db.listAccounts(userId);
          const kb   = list.map(a => ([
            { text: `🗑️ @${a.username}`, callback_data: `do_delete:${a.username}` }
          ]));
          kb.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
          await bot.sendMessage(chatId, 'Selecciona cuenta a eliminar:', {
            reply_markup: { inline_keyboard: kb }
          });
        }
        break;

      case 'do_delete':
        await db.removeAccount(userId, arg);
        await bot.sendMessage(chatId, `🗑️ Cuenta @${arg} eliminada.`);
        states[userId] = {};
        await bot.sendMessage(chatId, 'Elige una opción:', menu.mainMenu(admin));
        break;

      case 'list':
        {
          const accs = await db.listAccounts(userId);
          const lm = menu.listMenu(accs);
          if (lm.text) {
            // Sin cuentas
            await bot.sendMessage(chatId, lm.text, { parse_mode: 'HTML' });
          } else {
            // Mostrar botones
            await bot.sendMessage(chatId, '<b>📋 Tus cuentas:</b>', lm);
          }
        }
        break;

      case 'realtime':
        states[userId] = { state: 'AWAIT_REALTIME' };
        {
          const accs = await db.listAccounts(userId);
          const rm = menu.realtimeMenu(accs);
          if (rm) {
            await bot.sendMessage(chatId, '<b>🔔 Seguimiento realtime</b>', rm);
          } else {
            await bot.sendMessage(chatId, 'No tienes cuentas.');
          }
        }
        break;

      case 'toggle':
        {
          const accs = await db.listAccounts(userId);
          const acc  = accs.find(a => a.username === arg);
          if (acc) {
            if (!acc.active) {
              await trackSvc.startTracking(bot, chatId, userId, arg);
            } else {
              await trackSvc.stopTracking(bot, chatId, userId, arg);
            }
          }
          const updated = await db.listAccounts(userId);
          await bot.sendMessage(chatId, '<b>🔔 Seguimiento realtime</b>', menu.realtimeMenu(updated));
        }
        break;

      case 'plan_menu':
        if (admin) {
          await bot.sendMessage(chatId, 'Elige plan:', menu.planMenu());
        } else {
          await bot.sendMessage(chatId, 'Solo admin.');
        }
        break;

      case 'plan':
        if (admin) {
          await planSvc.upgradePlan(userId, arg);
          await bot.sendMessage(
            chatId,
            `✅ Plan: <b>${arg}</b>`,
            { parse_mode: 'HTML' }
          );
        } else {
          await bot.sendMessage(chatId, 'No tienes permiso.');
        }
        break;

      case 'actions':
        {
          const accs = await db.listAccounts(userId);
          if (!accs.length) {
            await bot.sendMessage(chatId, 'No tienes cuentas.');
            break;
          }
          const kb2 = accs.map(a => ([
            { text: `@${a.username}`, callback_data: `show_actions:${a.username}` }
          ]));
          kb2.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
          await bot.sendMessage(chatId, 'Selecciona cuenta:', {
            reply_markup: { inline_keyboard: kb2 }
          });
        }
        break;

      case 'show_actions':
        await bot.sendMessage(
          chatId,
          `Acciones de @${arg}:`,
          menu.accountActionsMenu(arg)
        );
        break;

      case 'view_user':
        {
          const txt = await acctSvc.viewUser(arg);
          await bot.sendMessage(
            chatId,
            txt,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        }
        break;

      case 'last_tweet':
        {
          const txt = await acctSvc.lastTweet(arg);
          await bot.sendMessage(
            chatId,
            txt,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        }
        break;

      case 'mentions':
        {
          const txt = await acctSvc.mentions(arg);
          await bot.sendMessage(
            chatId,
            txt,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        }
        break;

      case 'replies':
        {
          const txt = await acctSvc.replies(arg);
          await bot.sendMessage(
            chatId,
            txt,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        }
        break;

      case 'retweets':
        {
          const txt = await acctSvc.retweets(arg);
          await bot.sendMessage(
            chatId,
            txt,
            { parse_mode: 'HTML', disable_web_page_preview: true }
          );
        }
        break;

      case 'back':
        // Si venimos del menú realtime, detener seguimientos activos
        if (states[userId]?.state === 'AWAIT_REALTIME') {
          const accs = await db.listAccounts(userId);
          for (const a of accs.filter(a => a.active)) {
            await trackSvc.stopTracking(bot, chatId, userId, a.username);
          }
        }
        states[userId] = {};
        await bot.sendMessage(chatId, 'Elige una opción:', menu.mainMenu(admin));
        break;

      case 'exit':
        delete states[userId];
        await bot.sendMessage(chatId, '✔️ Hasta luego! Usa /start para volver.');
        break;
    }

    await bot.answerCallbackQuery(q.id);
  } catch (err) {
    logger.error(err.stack);
    await bot.sendMessage(chatId, '❌ Ocurrió un error, intenta de nuevo.');
    await bot.answerCallbackQuery(q.id);
  }
});

// ————————————————
// Manejo de texto libre para AWAIT_ADD
// ————————————————
bot.on('message', async (msg) => {
  // Ignorar solo /start
  if (msg.text?.startsWith('/start')) return;

  const userId = msg.from.id;
  const state  = states[userId]?.state;

  if (state === 'AWAIT_ADD') {
    const username = msg.text.trim().replace(/^@/, '');
    const res = await db.addAccount(userId, username);

    let reply;
    if (res.ok) {
      reply = `✅ @${username} agregada.`;
    } else if (res.reason === 'exists') {
      reply = `⚠️ @${username} ya existe en tu lista.`;
    } else {
      reply = '⚠️ Has alcanzado el límite de cuentas para tu plan.';
    }

    await bot.sendMessage(msg.chat.id, reply);

    // Reset y volver al menú
    states[userId] = {};
    const admin = await isAdmin(msg.chat.id, userId);
    await bot.sendMessage(
      msg.chat.id,
      'Elige una opción:',
      menu.mainMenu(admin)
    );
  }
});
