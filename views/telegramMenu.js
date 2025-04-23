// D:\Documents\GitHub\BotXTwitterApi-twitterapi\views\telegramMenu.js
function mainMenu(isAdmin) {
  const buttons = [
    [ { text: '➕ Agregar',    callback_data: 'add' } ],
    [ { text: '❌ Eliminar',   callback_data: 'delete' } ],
    [ { text: '👀 Ver',        callback_data: 'list' } ],
    [ { text: '🔔 Tiempo real',callback_data: 'realtime' } ],
    [ { text: '📊 Acciones',   callback_data: 'actions' } ],
    ...(isAdmin ? [[{ text: '💼 Plan', callback_data: 'plan_menu' }]] : []),
    [ { text: '🚪 Salir',      callback_data: 'exit' } ]
  ];
  return { parse_mode: 'HTML', reply_markup: { inline_keyboard: buttons } };
}
function promptUsername() { return '✏️ Ingresa el nombre de la cuenta (sin @):'; }
function listView(accounts) {
  return accounts.length
    ? accounts.map(a => `• @${a.username}${a.active?' 🔔':''}`).join('\n')
    : '📂 No tienes cuentas agregadas.';
}
function realtimeMenu(accounts) {
  if (!accounts.length) return null;
  const rows = accounts.map(a => ([{
    text: a.active ? `🛑 Detener @${a.username}` : `▶️ Seguir @${a.username}`,
    callback_data: `toggle:${a.username}`
  }]));
  rows.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
  return { parse_mode: 'HTML', reply_markup: { inline_keyboard: rows } };
}
function planMenu() {
  return { parse_mode: 'HTML', reply_markup: {
    inline_keyboard: [
      ...Object.keys(require('../config').PLANS).map(p => ([{ text: p, callback_data: `plan:${p}` }])),
      [{ text: '⬅️ Volver', callback_data: 'back' }]
    ]
  }};
}
function accountActionsMenu(username) {
  return { parse_mode: 'HTML', reply_markup: {
    inline_keyboard: [
      [{ text: '👤 Ver usuario', callback_data: `view_user:${username}` }],
      [{ text: '📝 Último tweet',callback_data: `last_tweet:${username}` }],
      [{ text: '📣 Menciones',   callback_data: `mentions:${username}` }],
      [{ text: '💬 Respuestas',  callback_data: `replies:${username}` }],
      [{ text: '🔁 Retweets',    callback_data: `retweets:${username}` }],
      [{ text: '⬅️ Volver',      callback_data: 'back' }]
    ]
  }};
}

module.exports = {
  mainMenu, promptUsername, listView,
  realtimeMenu, planMenu, accountActionsMenu
};
