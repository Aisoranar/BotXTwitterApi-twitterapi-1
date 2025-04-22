// D:\Documents\GitHub\BotXTwitterApi-twitterapi\db\database.js
const fs   = require('fs-extra');
const path = require('path');
const { PLANS } = require('../config');

const DB_PATH = path.join(__dirname, 'db.json');
let db = {};

// Cargar la base de datos desde archivo
async function loadDB() {
  db = await fs.readJson(DB_PATH).catch(() => ({}));
}

// Guardar la base de datos en archivo
async function saveDB() {
  await fs.writeJson(DB_PATH, db, { spaces: 2 });
}

// Inicializar un usuario si no existe
async function initUser(userId) {
  if (!db[userId]) {
    db[userId] = {
      tracked: [],
      plan:    'intermediate'
    };
    await saveDB();
  }
}

// Obtener usuario, asegurando su inicialización
async function getUser(userId) {
  await initUser(userId);
  return db[userId];
}

// Agregar una cuenta a seguimiento
async function addAccount(userId, username) {
  const user  = await getUser(userId);
  const limit = PLANS[user.plan] || PLANS.intermediate;

  if (user.tracked.some(a => a.username === username)) {
    return { ok: false, reason: 'exists' };
  }
  if (user.tracked.length >= limit) {
    return { ok: false, reason: 'limit' };
  }

  // Nuevo campo ruleId para Webhook/Websocket
  user.tracked.push({
    username,
    active: false,
    ruleId: null
  });
  await saveDB();
  return { ok: true };
}

// Eliminar cuenta del seguimiento
async function removeAccount(userId, username) {
  const user = await getUser(userId);
  user.tracked = user.tracked.filter(a => a.username !== username);
  await saveDB();
  return true;
}

// Listar cuentas del usuario
async function listAccounts(userId) {
  const user = await getUser(userId);
  return user.tracked || [];
}

// Actualizar una cuenta específica
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

// Cargar base de datos al iniciar
loadDB();

module.exports = {
  initUser,
  getUser,
  addAccount,
  removeAccount,
  listAccounts,
  updateAccount,
  saveDB      // <-- exportamos saveDB para planService
};
