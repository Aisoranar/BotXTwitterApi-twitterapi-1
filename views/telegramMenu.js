// D:\Documents\GitHub\BotXTwitterApi-twitterapi\views\telegramMenu.js

function mainMenu(isAdmin) {
  const items = [
    { text: '➕ Agregar',     callback_data: 'add' },
    { text: '❌ Eliminar',    callback_data: 'delete' },
    { text: '👀 Ver',         callback_data: 'list' },
    { text: '🔔 Tiempo real', callback_data: 'realtime' },
    { text: '📊 Acciones',    callback_data: 'actions' },
    ...(isAdmin ? [{ text: '💼 Plan', callback_data: 'plan_menu' }] : []),
    { text: '🚪 Salir',       callback_data: 'exit' }
  ];

  // Agrupar en filas de 3, 2 y 1 botón
  const sizes = [3, 2, 1];
  const rows = [];
  let idx = 0;

  for (const size of sizes) {
    if (idx < items.length) {
      rows.push(items.slice(idx, idx + size));
      idx += size;
    }
  }
  // Si quedan botones adicionales, cada uno en su fila
  for (; idx < items.length; idx++) {
    rows.push([items[idx]]);
  }

  return {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: rows }
  };
}

function promptUsername() {
  return '✏️ Ingresa el nombre de la cuenta (sin @):';
}

function listView(accounts) {
  return accounts.length
    ? accounts.map(a => `• @${a.username}${a.active?' 🔔':''}`).join('\n')
    : '📂 No tienes cuentas agregadas.';
}

function realtimeMenu(accounts) {
  if (!accounts.length) return null;
  const rows = accounts.map(a => ([
    {
      text: a.active ? `🛑 Detener @${a.username}` : `▶️ Seguir @${a.username}`,
      callback_data: `toggle:${a.username}`
    }
  ]));
  rows.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
  return {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: rows }
  };
}

function planMenu() {
  const plans = Object.keys(require('../config').PLANS);
  const rows = plans.map(p => ([{ text: p, callback_data: `plan:${p}` }]));
  rows.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
  return {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: rows }
  };
}

function accountActionsMenu(username) {
  return {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '👤 Ver usuario', callback_data: `view_user:${username}` }],
        [{ text: '📝 Último tweet', callback_data: `last_tweet:${username}` }],
        [{ text: '📣 Menciones',    callback_data: `mentions:${username}` }],
        [{ text: '💬 Respuestas',   callback_data: `replies:${username}` }],
        [{ text: '🔁 Retweets',     callback_data: `retweets:${username}` }],
        [{ text: '⬅️ Volver',       callback_data: 'back' }]
      ]
    }
  };
}

module.exports = {
  mainMenu,
  promptUsername,
  listView,
  realtimeMenu,
  planMenu,
  accountActionsMenu
};
