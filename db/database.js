// File: db/database.js
const fs   = require('fs');
const path = require('path');
const { PLANS } = require('../config');

const DB_PATH = path.join(__dirname, 'db.json');
let db = {};

/**
 * Carga inicial de la DB de forma síncrona.
 */
function loadDB() {
  if (fs.existsSync(DB_PATH)) {
    const raw = fs.readFileSync(DB_PATH, 'utf-8').trim();
    try {
      db = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[DB] db.json corrupto, inicializando vacío.');
      db = {};
    }
  } else {
    db = {};
  }
}

/**
 * Persiste la DB de forma síncrona.
 */
function saveDB() {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
}

/**
 * Asegura que exista la entrada del usuario.
 */
function initUser(userId) {
  if (!db[userId]) {
    db[userId] = {
      tracked:      [],   // cuentas a seguir
      plan:         'intermediate',
      groupChatId:  null  // grupo donde llamó /start
    };
    saveDB();
  }
}

/**
 * Devuelve el objeto de usuario (creándolo si no existía).
 */
function getUser(userId) {
  initUser(userId);
  return db[userId];
}

/**
 * Devuelve todos los usuarios (para fan-out webhooks).
 */
function getAllUsers() {
  return db;
}

/**
 * Asocia el chat de grupo al usuario.
 */
function setUserGroupChat(userId, chatId) {
  const user = getUser(userId);
  user.groupChatId = chatId;
  saveDB();
}

/**
 * Agrega una cuenta a seguir.
 */
function addAccount(userId, username) {
  const user  = getUser(userId);
  const limit = PLANS[user.plan] || PLANS.intermediate;
  if (user.tracked.some(a => a.username === username)) {
    return { ok: false, reason: 'exists' };
  }
  if (user.tracked.length >= limit) {
    return { ok: false, reason: 'limit' };
  }
  user.tracked.push({ username, active: false, ruleId: null, lastChecked: null });
  saveDB();
  return { ok: true };
}

/**
 * Elimina una cuenta de seguimiento.
 */
function removeAccount(userId, username) {
  const user = getUser(userId);
  const before = user.tracked.length;
  user.tracked = user.tracked.filter(a => a.username !== username);
  saveDB();
  return user.tracked.length < before;
}

/**
 * Lista cuentas que sigue el usuario.
 */
function listAccounts(userId) {
  return getUser(userId).tracked;
}

/**
 * Actualiza datos de una cuenta.
 */
function updateAccount(userId, account) {
  const user = getUser(userId);
  const idx  = user.tracked.findIndex(a => a.username === account.username);
  if (idx >= 0) {
    user.tracked[idx] = account;
    saveDB();
    return true;
  }
  return false;
}

// Carga inicial
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
