// D:\Documents\GitHub\BotXTwitterApi-twitterapi\db\database.js
const fs   = require('fs-extra');
const path = require('path');
const { PLANS } = require('../config');

const DB_PATH = path.join(__dirname, 'db.json');
let db = {};

// Carga inicial de la DB
async function loadDB() {
  db = await fs.readJson(DB_PATH).catch(() => ({}));
}
// Persiste la DB
async function saveDB() {
  await fs.writeJson(DB_PATH, db, { spaces: 2 });
}

// Asegura que el usuario tenga un entry, y guarda el chat de grupo
async function initUser(userId) {
  if (!db[userId]) {
    db[userId] = {
      tracked:      [],  // cuentas a seguir
      plan:    'intermediate',
      groupChatId: null  // grupo donde llamó /start
    };
    await saveDB();
  }
}

// Obtiene usuario (inicia si no existe)
async function getUser(userId) {
  await initUser(userId);
  return db[userId];
}

// Retorna todos los usuarios (para fan-out)
function getAllUsers() {
  return db;
}

// Asocia al usuario con un chat de grupo
async function setUserGroupChat(userId, chatId) {
  const user = await getUser(userId);
  user.groupChatId = chatId;
  await saveDB();
}

// Agrega una cuenta a seguir
async function addAccount(userId, username) {
  const user  = await getUser(userId);
  const limit = PLANS[user.plan] || PLANS.intermediate;
  if (user.tracked.some(a => a.username === username)) {
    return { ok: false, reason: 'exists' };
  }
  if (user.tracked.length >= limit) {
    return { ok: false, reason: 'limit' };
  }
  user.tracked.push({ username, active: false, ruleId: null });
  await saveDB();
  return { ok: true };
}

// Elimina una cuenta de seguimiento
async function removeAccount(userId, username) {
  const user = await getUser(userId);
  user.tracked = user.tracked.filter(a => a.username !== username);
  await saveDB();
  return true;
}

// Lista cuentas que sigue el usuario
async function listAccounts(userId) {
  const user = await getUser(userId);
  return user.tracked;
}

// Actualiza datos de una cuenta
async function updateAccount(userId, account) {
  const user = await getUser(userId);
  const idx  = user.tracked.findIndex(a => a.username === account.username);
  if (idx >= 0) {
    user.tracked[idx] = account;
    await saveDB();
    return true;
  }
  return false;
}

loadDB();

module.exports = {
  initUser,
  getUser,
  getAllUsers,
  setUserGroupChat,
  addAccount,
  removeAccount,
  listAccounts,
  updateAccount,
  saveDB
};
