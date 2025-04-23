// D:\Documents\GitHub\BotXTwitterApi-twitterapi\views\telegramMenu.js

/**
 * Menú principal con botones agrupados de forma dinámica.
 * @param {boolean} isAdmin - Si el usuario es administrador.
 */
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

/** Mensaje de solicitud de nombre de cuenta. */
function promptUsername() {
  return '✏️ Ingresa el nombre de la cuenta (sin @):';
}

/**
 * Vista de lista simple (texto plano).
 * @param {Array} accounts
 */
function listView(accounts) {
  return accounts.length
    ? accounts.map(a => `• @${a.username}${a.active ? ' 🔔' : ''}`).join('\n')
    : '📂 No tienes cuentas agregadas.';
}

/**
 * Menú interactivo para ver cuentas con botones.
 * @param {Array} accounts
 */
function listMenu(accounts) {
  if (!accounts.length) {
    return {
      text: '📂 No tienes cuentas agregadas.',
      parse_mode: 'HTML'
    };
  }

  const rows = accounts.map(a => ([
    {
      text: `@${a.username}${a.active ? ' 🔔' : ''}`,
      callback_data: `show_actions:${a.username}`
    }
  ]));
  rows.push([{ text: '⬅️ Volver', callback_data: 'back' }]);

  return {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: rows }
  };
}

/**
 * Menú de seguimiento en tiempo real.
 * @param {Array} accounts
 */
function realtimeMenu(accounts) {
  if (!accounts.length) return null;
  const rows = accounts.map(a => ([
    {
      text: a.active
        ? `🛑 Detener @${a.username}`
        : `▶️ Seguir @${a.username}`,
      callback_data: `toggle:${a.username}`
    }
  ]));
  rows.push([{ text: '⬅️ Volver', callback_data: 'back' }]);
  return {
    parse_mode: 'HTML',
    reply_markup: { inline_keyboard: rows }
  };
}

/**
 * Menú de selección de plan en dos columnas con emojis.
 */
function planMenu() {
  return {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🥉 Basic',        callback_data: 'plan:basic' },
          { text: '🥈 Intermediate', callback_data: 'plan:intermediate' }
        ],
        [
          { text: '🥇 Pro',          callback_data: 'plan:pro' },
          { text: '🏆 Premium',      callback_data: 'plan:premium' }
        ],
        [
          { text: '⬅️ Volver',       callback_data: 'back' }
        ]
      ]
    }
  };
}

/**
 * Menú de acciones disponibles para una cuenta seleccionada.
 * @param {string} username
 */
function accountActionsMenu(username) {
  return {
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [{ text: '👤 Ver usuario',      callback_data: `view_user:${username}` }],
        [{ text: '📝 Último tweet',      callback_data: `last_tweet:${username}` }],
        [{ text: '📣 Ver menciones',     callback_data: `mentions:${username}` }],
        [{ text: '💬 Ver respuestas',    callback_data: `replies:${username}` }],
        [{ text: '🔁 Ver retweets',      callback_data: `retweets:${username}` }],
        [{ text: '⬅️ Volver',            callback_data: 'back' }]
      ]
    }
  };
}

module.exports = {
  mainMenu,
  promptUsername,
  listView,
  listMenu,
  realtimeMenu,
  planMenu,
  accountActionsMenu
};
