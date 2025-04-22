// D:\Documents\GitHub\BotXTwitterApi-twitterapi\app.js
'use strict';

const TelegramBot           = require('node-telegram-bot-api');
const config                = require('./config');
const db                    = require('./db/database');
const trackSvc              = require('./services/trackingService');
const planSvc               = require('./services/planService');
const menu                  = require('./views/telegramMenu');
const logger                = require('./utils/logger');
const accountActionsService = require('./services/accountActionsService');

const bot    = new TelegramBot(config.TELEGRAM_TOKEN, { polling: true });
const states = {};

async function isAdmin(chatId, userId) {
  try {
    const member = await bot.getChatMember(chatId, userId);
    return ['administrator', 'creator'].includes(member.status);
  } catch {
    return false;
  }
}

// /start handler
bot.onText(/\/start/, async (msg) => {
  const {
    chat: { id: chatId },
    from: { id: uid, first_name }
  } = msg;

  await db.initUser(uid);
  states[uid] = { state: null };
  const admin = await isAdmin(chatId, uid);

  const greeting = `👋 Hola, <b>${first_name}</b>!\n¿Qué deseas hacer hoy?`;
  await bot.sendMessage(chatId, greeting, { parse_mode: 'HTML' });
  await bot.sendMessage(chatId, 'Elige una opción del menú:', menu.mainMenu(admin));
});

// Callback query handler
bot.on('callback_query', async (q) => {
  const {
    message: { chat: { id: chatId } },
    from: { id: uid },
    data
  } = q;

  const [cmd, arg] = data.split(':');
  const admin      = await isAdmin(chatId, uid);

  try {
    switch (cmd) {
      case 'add':
        states[uid].state = 'AWAIT_ADD';
        await bot.sendMessage(chatId, menu.promptUsername());
        break;

      case 'delete':
        states[uid].state = 'AWAIT_DELETE';
        {
          const list = await db.listAccounts(uid);
          const kb   = list.map(a => ([{
            text: `🗑️ @${a.username}`,
            callback_data: `do_delete:${a.username}`
          }]));
          kb.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
          await bot.sendMessage(chatId, 'Selecciona cuenta a eliminar:', {
            reply_markup: { inline_keyboard: kb }
          });
        }
        break;

      case 'do_delete':
        await db.removeAccount(uid, arg);
        await bot.sendMessage(chatId, `🗑️ Cuenta @${arg} eliminada.`);
        states[uid].state = null;
        await bot.sendMessage(chatId, 'Elige una opción:', menu.mainMenu(admin));
        break;

      case 'list': {
        const accounts = await db.listAccounts(uid);
        const text     = `<b>📋 Tus cuentas:</b>\n${menu.listView(accounts)}`;
        await bot.sendMessage(chatId, text, { parse_mode: 'HTML' });
        break;
      }

      case 'realtime':
        states[uid].state = 'AWAIT_REALTIME';
        {
          const accounts = await db.listAccounts(uid);
          const rMenu    = menu.realtimeMenu(accounts);
          if (rMenu) {
            await bot.sendMessage(chatId, '<b>🔔 Seguimiento en tiempo real</b>', rMenu);
          } else {
            await bot.sendMessage(chatId, 'No tienes cuentas para seguimiento.');
          }
        }
        break;

      case 'toggle':
        {
          const accounts = await db.listAccounts(uid);
          const acc      = accounts.find(a => a.username === arg);
          if (acc) {
            if (!acc.active) {
              // Activa con webhook
              await trackSvc.startTracking(bot, chatId, uid, arg);
            } else {
              // Desactiva la regla
              await trackSvc.stopTracking(bot, chatId, uid, arg);
            }
          }
          const updated = await db.listAccounts(uid);
          await bot.sendMessage(
            chatId,
            '<b>🔔 Seguimiento en tiempo real</b>',
            menu.realtimeMenu(updated)
          );
        }
        break;

      case 'plan_menu':
        if (admin) {
          await bot.sendMessage(chatId, 'Elige un plan:', menu.planMenu());
        } else {
          await bot.sendMessage(chatId, 'Solo administradores pueden cambiar el plan.');
        }
        break;

      case 'plan':
        if (admin) {
          await planSvc.upgradePlan(uid, arg);
          await bot.sendMessage(chatId, `✅ Plan actualizado a <b>${arg}</b>.`, { parse_mode: 'HTML' });
        } else {
          await bot.sendMessage(chatId, 'No tienes permiso para cambiar planes.');
        }
        break;

      case 'actions':
        {
          const accounts = await db.listAccounts(uid);
          if (!accounts.length) {
            await bot.sendMessage(chatId, 'No tienes cuentas agregadas.');
            break;
          }
          const kb = accounts.map(a => ([{
            text: `@${a.username}`,
            callback_data: `show_actions:${a.username}`
          }]));
          kb.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
          await bot.sendMessage(chatId, 'Selecciona una cuenta:', {
            reply_markup: { inline_keyboard: kb }
          });
        }
        break;

      case 'show_actions':
        await bot.sendMessage(chatId, `Acciones de @${arg}:`, menu.accountActionsMenu(arg));
        break;

      case 'view_user': {
        const msg = await accountActionsService.viewUser(arg);
        await bot.sendMessage(chatId, msg, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        break;
      }

      case 'last_tweet': {
        const msg = await accountActionsService.lastTweet(arg);
        await bot.sendMessage(chatId, msg, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        break;
      }

      case 'mentions': {
        const msg = await accountActionsService.mentions(arg);
        await bot.sendMessage(chatId, msg, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        break;
      }

      case 'replies': {
        const msg = await accountActionsService.replies(arg);
        await bot.sendMessage(chatId, msg, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        break;
      }

      case 'retweets': {
        const msg = await accountActionsService.retweets(arg);
        await bot.sendMessage(chatId, msg, {
          parse_mode: 'HTML',
          disable_web_page_preview: true
        });
        break;
      }

      case 'back':
        states[uid].state = null;
        await bot.sendMessage(chatId, 'Elige una opción:', menu.mainMenu(admin));
        break;

      case 'exit':
        delete states[uid];
        await bot.sendMessage(chatId, '✔️ Hasta luego! Usa /start para volver.');
        break;
    }

    await bot.answerCallbackQuery(q.id);
  } catch (err) {
    logger.error(err.message);
    await bot.sendMessage(chatId, 'Ha ocurrido un error, intenta de nuevo.');
  }
});

// Manejador de mensajes libres
bot.on('message', async (msg) => {
  const uid    = msg.from.id;
  const chatId = msg.chat.id;
  const state  = states[uid]?.state;
  const text   = msg.text?.trim();

  if (!text || msg.from.is_bot) return;

  if (state === 'AWAIT_ADD') {
    const username = text.replace(/^@/, '');
    const res      = await db.addAccount(uid, username);
    let reply;
    if (res.ok)            reply = `✅ @${username} agregada.`;
    else if (res.reason==='exists') reply = `⚠️ @${username} ya existe.`;
    else                   reply = '⚠️ Limite alcanzado.';

    await bot.sendMessage(chatId, reply);
    states[uid].state = null;
    const admin = await isAdmin(chatId, uid);
    await bot.sendMessage(chatId, 'Elige una opción:', menu.mainMenu(admin));
  }
});
