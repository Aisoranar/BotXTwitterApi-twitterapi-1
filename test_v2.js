"use strict";

const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// =========================================================================
// CONFIGURACIÓN (tu configuración actual)
// =========================================================================
const telegram = {
  botToken: "7325587317:AAEi3O2F2CckkIeOnmJkqXxcxRTxfNikqOQ",
  chatId: "-1002513153868"
};

// =========================================================================
// TWITTER API GRATUITA (usando endpoints públicos)
// =========================================================================
class FreeTwitterAPI {
  constructor() {
    this.rateLimitDelay = 2000; // 2 segundos entre requests
    this.lastRequest = 0;
  }

  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequest;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequest = Date.now();
  }

  async getUserInfo(username) {
    try {
      await this.waitForRateLimit();
      
      // Intentar con endpoint público de Twitter
      const response = await axios.get('https://cdn.syndication.twimg.com/widgets/followbutton/info.json', {
        params: { screen_names: username },
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data && response.data.length > 0) {
        const user = response.data[0];
        return {
          success: true,
          data: {
            id: user.id,
            userName: user.screen_name,
            name: user.name,
            description: user.description || 'Sin descripción',
            followers: user.followers_count || 0,
            following: user.friends_count || 0,
            statusesCount: user.statuses_count || 0,
            location: user.location || 'No especificada',
            isVerified: user.verified || false,
            profileImage: user.profile_image_url || ''
          }
        };
      }

      return { success: false, error: 'Usuario no encontrado' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Simulador de tweets para demostración
  async getUserTweets(username) {
    try {
      await this.waitForRateLimit();

      // Como no podemos obtener tweets reales gratis, simularemos algunos
      const simulatedTweets = [
        {
          id: Date.now().toString(),
          text: `🔥 Tweet simulado de @${username} - ${new Date().toLocaleTimeString()}`,
          createdAt: new Date().toISOString(),
          likeCount: Math.floor(Math.random() * 1000),
          retweetCount: Math.floor(Math.random() * 500),
          replyCount: Math.floor(Math.random() * 100),
          isSimulated: true
        },
        {
          id: (Date.now() - 3600000).toString(),
          text: `📝 Otro tweet simulado para probar el sistema de notificaciones`,
          createdAt: new Date(Date.now() - 3600000).toISOString(),
          likeCount: Math.floor(Math.random() * 500),
          retweetCount: Math.floor(Math.random() * 200),
          replyCount: Math.floor(Math.random() * 50),
          isSimulated: true
        }
      ];

      return {
        success: true,
        tweets: simulatedTweets
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async searchTweets(query) {
    // Simulación de búsqueda
    return {
      success: true,
      tweets: [
        {
          id: Date.now().toString(),
          text: `Resultado simulado para: ${query}`,
          createdAt: new Date().toISOString(),
          likeCount: Math.floor(Math.random() * 100),
          retweetCount: Math.floor(Math.random() * 50),
          replyCount: Math.floor(Math.random() * 25),
          author: { userName: 'simulateduser' },
          isSimulated: true
        }
      ]
    };
  }
}

// =========================================================================
// SISTEMA DE LOGS Y ESTADO (igual que antes)
// =========================================================================
class MonitorSystem {
  constructor() {
    this.isMonitorActive = false;
    this.monitoredAccounts = new Map();
    this.lastTweetIds = new Map();
    this.monitorInterval = null;
    this.checkIntervalMs = 60000; // 1 minuto para la versión gratuita
    this.dataFile = path.join(__dirname, 'monitor_data.json');
    this.logFile = path.join(__dirname, 'monitor.log');
    
    this.loadData();
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${level}: ${message}`;
    console.log(logEntry);
    
    try {
      fs.appendFileSync(this.logFile, logEntry + '\n');
    } catch (error) {
      console.error('Error escribiendo log:', error);
    }
  }

  loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const data = JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
        this.monitoredAccounts = new Map(data.monitoredAccounts || []);
        this.lastTweetIds = new Map(data.lastTweetIds || []);
        this.log(`Datos cargados: ${this.monitoredAccounts.size} cuentas`);
      }
    } catch (error) {
      this.log(`Error cargando datos: ${error.message}`, 'ERROR');
    }
  }

  saveData() {
    try {
      const data = {
        monitoredAccounts: Array.from(this.monitoredAccounts.entries()),
        lastTweetIds: Array.from(this.lastTweetIds.entries()),
        lastSaved: new Date().toISOString()
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      this.log(`Error guardando datos: ${error.message}`, 'ERROR');
    }
  }

  addAccount(username, settings = { receiveTweets: true, receiveRetweets: true }) {
    this.monitoredAccounts.set(username, settings);
    this.saveData();
    this.log(`Cuenta añadida: @${username}`);
  }

  getMonitoredAccounts() {
    return Array.from(this.monitoredAccounts.keys());
  }

  updateLastTweetId(username, tweetId) {
    this.lastTweetIds.set(username, tweetId);
    this.saveData();
  }

  getLastTweetId(username) {
    return this.lastTweetIds.get(username) || null;
  }
}

// =========================================================================
// MONITOR CON API GRATUITA
// =========================================================================
class FreeTwitterMonitor {
  constructor() {
    this.twitterAPI = new FreeTwitterAPI();
    this.metrics = {
      tweetsDetected: 0,
      tweetsSent: 0,
      errors: 0,
      startTime: null
    };
  }

  async startMonitoring() {
    if (monitor.isMonitorActive) {
      return { success: false, message: 'Monitor ya está activo' };
    }

    const accounts = monitor.getMonitoredAccounts();
    if (accounts.length === 0) {
      return { success: false, message: 'No hay cuentas para monitorear' };
    }

    monitor.isMonitorActive = true;
    this.metrics.startTime = new Date();
    
    monitor.log(`🚀 MONITOR GRATUITO INICIADO - ${accounts.length} cuentas`);
    monitor.log(`🔄 Verificando cada ${monitor.checkIntervalMs / 1000} segundos`);

    // Iniciar bucle
    monitor.monitorInterval = setInterval(() => {
      this.checkAllAccounts();
    }, monitor.checkIntervalMs);

    // Notificación inicial
    const message = `🚀 <b>Monitor Gratuito Iniciado</b>\n\n` +
      `📱 Cuentas: ${accounts.length}\n` +
      `⏰ Frecuencia: cada ${monitor.checkIntervalMs / 1000}s\n` +
      `🔔 Modo: Simulación/Demo\n` +
      `💡 Para tweets reales, configura una API\n\n` +
      `<i>Cuentas: ${accounts.map(a => '@' + a).join(', ')}</i>`;

    await sendTelegramMessage(message);

    return { success: true, message: `Monitor iniciado para ${accounts.length} cuentas` };
  }

  async pauseMonitoring() {
    if (!monitor.isMonitorActive) {
      return { success: false, message: 'Monitor no está activo' };
    }

    monitor.isMonitorActive = false;
    if (monitor.monitorInterval) {
      clearInterval(monitor.monitorInterval);
      monitor.monitorInterval = null;
    }

    monitor.log('⏸️ MONITOR PAUSADO');
    
    const uptime = this.metrics.startTime ? 
      Math.floor((Date.now() - this.metrics.startTime.getTime()) / 1000) : 0;

    const message = `⏸️ <b>Monitor Pausado</b>\n\n` +
      `📊 Estadísticas:\n` +
      `• Tweets detectados: ${this.metrics.tweetsDetected}\n` +
      `• Tweets enviados: ${this.metrics.tweetsSent}\n` +
      `• Errores: ${this.metrics.errors}\n` +
      `• Tiempo activo: ${this.formatUptime(uptime)}`;

    await sendTelegramMessage(message);

    return { success: true, message: 'Monitor pausado' };
  }

  async checkAllAccounts() {
    if (!monitor.isMonitorActive) return;

    const accounts = monitor.getMonitoredAccounts();
    monitor.log(`🔍 Verificando ${accounts.length} cuentas (modo gratuito)...`);

    for (const username of accounts) {
      try {
        await this.checkAccountTweets(username);
        await new Promise(resolve => setTimeout(resolve, 3000)); // Espera entre cuentas
      } catch (error) {
        this.metrics.errors++;
        monitor.log(`❌ Error verificando @${username}: ${error.message}`, 'ERROR');
      }
    }
  }

  async checkAccountTweets(username) {
    try {
      monitor.log(`🔍 Verificando @${username}...`);

      const result = await this.twitterAPI.getUserTweets(username);
      
      if (!result.success || !result.tweets) {
        return;
      }

      const tweets = result.tweets;
      const lastKnownTweetId = monitor.getLastTweetId(username);
      const newTweets = this.filterNewTweets(tweets, lastKnownTweetId);

      if (newTweets.length > 0) {
        monitor.log(`📝 @${username}: ${newTweets.length} tweets nuevos (simulados)`);
        
        for (const tweet of newTweets.reverse()) {
          await this.processTweet(tweet, username);
        }

        monitor.updateLastTweetId(username, tweets[0].id);
      }

    } catch (error) {
      throw new Error(`Error API para @${username}: ${error.message}`);
    }
  }

  filterNewTweets(tweets, lastKnownTweetId) {
    if (!lastKnownTweetId) {
      return tweets.slice(0, 1); // Solo el más reciente la primera vez
    }

    const newTweets = [];
    for (const tweet of tweets) {
      if (tweet.id === lastKnownTweetId) {
        break;
      }
      newTweets.push(tweet);
    }

    return newTweets;
  }

  async processTweet(tweet, username) {
    try {
      const settings = monitor.monitoredAccounts.get(username);
      
      // Formatear mensaje
      const message = this.formatTweetMessage(tweet, username);
      
      // Enviar a Telegram
      await sendTelegramMessage(message);
      
      this.metrics.tweetsDetected++;
      this.metrics.tweetsSent++;

      monitor.log(`✅ Tweet simulado enviado: @${username} - ${tweet.id}`);

    } catch (error) {
      this.metrics.errors++;
      monitor.log(`❌ Error procesando tweet: ${error.message}`, 'ERROR');
    }
  }

  formatTweetMessage(tweet, username) {
    const icon = tweet.isSimulated ? "🧪" : "📝";
    const prefix = tweet.isSimulated ? " (DEMO)" : "";
    
    let message = `${icon} <b>@${username}</b> publicó${prefix}:\n\n`;
    message += `💬 ${tweet.text}\n\n`;
    message += `📅 ${this.formatDate(tweet.createdAt)}\n`;
    message += `❤️ ${tweet.likeCount} | 🔄 ${tweet.retweetCount} | 💬 ${tweet.replyCount}`;
    
    if (tweet.isSimulated) {
      message += `\n\n🔧 <i>Simulación - Configura una API real para tweets verdaderos</i>`;
    }
    
    return message;
  }

  formatDate(dateString) {
    try {
      return new Date(dateString).toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Fecha inválida';
    }
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  getMetrics() {
    const uptime = this.metrics.startTime ? 
      Math.floor((Date.now() - this.metrics.startTime.getTime()) / 1000) : 0;
    
    return {
      ...this.metrics,
      uptime,
      isActive: monitor.isMonitorActive
    };
  }
}

// =========================================================================
// CONFIGURACIÓN DEL BOT DE TELEGRAM
// =========================================================================
const bot = new TelegramBot(telegram.botToken, { polling: true });
const monitor = new MonitorSystem();
const twitterMonitor = new FreeTwitterMonitor();

async function sendTelegramMessage(message) {
  try {
    await bot.sendMessage(telegram.chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    monitor.log(`Error enviando mensaje: ${error.message}`, 'ERROR');
    throw error;
  }
}

function sendTelegramMenu(chatId) {
  const accounts = monitor.getMonitoredAccounts();
  const metrics = twitterMonitor.getMetrics();
  
  const menuMessage = `🤖 <b>Monitor de Twitter - Versión Gratuita</b>\n\n` +
    `📊 Estado: ${metrics.isActive ? '🟢 Activo' : '🔴 Inactivo'}\n` +
    `📱 Cuentas: ${accounts.length}\n` +
    `📝 Tweets enviados: ${metrics.tweetsSent}\n` +
    `🔧 Modo: Demo/Simulación\n\n` +
    `Selecciona una opción:`;

  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { 
            text: metrics.isActive ? "⏸️ Pausar Monitor" : "▶️ Iniciar Monitor", 
            callback_data: metrics.isActive ? "pause_monitor" : "start_monitor" 
          }
        ],
        [
          { text: "➕ Añadir Cuenta", callback_data: "add_account" },
          { text: "📱 Ver Cuentas", callback_data: "list_accounts" }
        ],
        [
          { text: "📊 Estadísticas", callback_data: "stats" },
          { text: "🔍 Info Usuario", callback_data: "user_info" }
        ],
        [
          { text: "🧪 Tweet de Prueba", callback_data: "test_tweet" },
          { text: "❓ Ayuda", callback_data: "help" }
        ],
        [
          { text: "🔧 Configurar API Real", callback_data: "setup_api" }
        ]
      ]
    }
  };

  bot.sendMessage(chatId, menuMessage, { parse_mode: "HTML", ...options });
}

// =========================================================================
// MANEJADORES DE COMANDOS
// =========================================================================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeMessage = `🚀 <b>¡Bienvenido al Monitor de Twitter!</b>\n\n` +
    `🔧 <b>Versión Gratuita/Demo</b>\n\n` +
    `Esta versión funciona con simulaciones para que puedas probar el sistema sin APIs de pago.\n\n` +
    `<b>🎯 Características:</b>\n` +
    `• Monitor automático cada minuto\n` +
    `• Información real de usuarios\n` +
    `• Tweets simulados para demo\n` +
    `• Todas las funciones del menú\n\n` +
    `<b>🔧 Para tweets reales:</b>\n` +
    `Configura una API de Twitter (te ayudo en el menú)\n\n` +
    `👇 Usa el menú para empezar:`;

  await bot.sendMessage(chatId, welcomeMessage, { parse_mode: "HTML" });
  sendTelegramMenu(chatId);
});

bot.onText(/\/add (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const username = match[1].replace('@', '').trim();
  
  try {
    const twitterAPI = new FreeTwitterAPI();
    const userInfo = await twitterAPI.getUserInfo(username);

    if (userInfo.success) {
      monitor.addAccount(username);
      
      const userData = userInfo.data;
      const message = `✅ <b>Cuenta añadida exitosamente</b>\n\n` +
        `👤 @${userData.userName}\n` +
        `📝 ${userData.name}\n` +
        `👥 ${userData.followers?.toLocaleString() || 0} seguidores\n` +
        `📍 ${userData.location}\n\n` +
        `🔔 Será monitoreada cuando inicies el monitor.\n` +
        `🧪 Recibirás tweets simulados en modo demo.`;
      
      await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
    } else {
      await bot.sendMessage(chatId, `❌ Usuario @${username} no encontrado o error: ${userInfo.error}`);
    }
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error verificando usuario: ${error.message}`);
  }
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const metrics = twitterMonitor.getMetrics();
  const accounts = monitor.getMonitoredAccounts();
  
  const statsMessage = `📊 <b>Estadísticas del Monitor</b>\n\n` +
    `🔄 <b>Estado:</b> ${metrics.isActive ? '🟢 Activo' : '🔴 Inactivo'}\n` +
    `⏰ <b>Tiempo activo:</b> ${twitterMonitor.formatUptime(metrics.uptime)}\n` +
    `📝 <b>Tweets detectados:</b> ${metrics.tweetsDetected}\n` +
    `📤 <b>Tweets enviados:</b> ${metrics.tweetsSent}\n` +
    `❌ <b>Errores:</b> ${metrics.errors}\n` +
    `📱 <b>Cuentas monitoreadas:</b> ${accounts.length}\n` +
    `🔍 <b>Frecuencia:</b> cada ${monitor.checkIntervalMs / 1000}s\n` +
    `🔧 <b>Modo:</b> Demo/Simulación\n\n` +
    `📈 <b>Eficiencia:</b> ${metrics.tweetsDetected > 0 ? 
      Math.round((metrics.tweetsSent / metrics.tweetsDetected) * 100) : 100}%`;

  await bot.sendMessage(chatId, statsMessage, { parse_mode: "HTML" });
});

// =========================================================================
// MANEJO DE CALLBACKS
// =========================================================================
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  try {
    switch (data) {
      case "start_monitor":
        const startResult = await twitterMonitor.startMonitoring();
        if (!startResult.success) {
          await bot.sendMessage(chatId, `❌ ${startResult.message}`);
        }
        break;

      case "pause_monitor":
        const pauseResult = await twitterMonitor.pauseMonitoring();
        if (!pauseResult.success) {
          await bot.sendMessage(chatId, `❌ ${pauseResult.message}`);
        }
        break;

      case "add_account":
        await bot.sendMessage(chatId, 
          "➕ <b>Añadir Cuenta</b>\n\n" +
          "Envía el nombre de usuario sin @:\n" +
          "Ejemplo: <code>elonmusk</code>\n\n" +
          "O usa: <code>/add usuario</code>", 
          { parse_mode: "HTML" }
        );
        break;

      case "list_accounts":
        await handleListAccounts(chatId);
        break;

      case "stats":
        await bot.sendMessage(chatId, '/stats');
        break;

      case "user_info":
        await handleUserInfo(chatId);
        break;

      case "test_tweet":
        await handleTestTweet(chatId);
        break;

      case "setup_api":
        await handleSetupAPI(chatId);
        break;

      case "help":
        await handleHelp(chatId);
        break;

      default:
        await bot.sendMessage(chatId, "❓ Opción no reconocida.");
    }
  } catch (error) {
    monitor.log(`❌ Error en callback: ${error.message}`, 'ERROR');
    await bot.sendMessage(chatId, "❌ Error procesando la solicitud.");
  }

  await bot.answerCallbackQuery(callbackQuery.id);
  setTimeout(() => sendTelegramMenu(chatId), 2000);
});

// =========================================================================
// FUNCIONES AUXILIARES
// =========================================================================
async function handleListAccounts(chatId) {
  const accounts = monitor.getMonitoredAccounts();
  CONFIG.telegram.botToken
  if (accounts.length === 0) {
    await bot.sendMessage(chatId, 
      "📱 No hay cuentas monitoreadas.\n\n" +
      "Usa ➕ Añadir Cuenta o envía:\n" +
      "<code>/add username</code>", 
      { parse_mode: "HTML" }
    );
    return;
  }

  let message = "📱 <b>Cuentas Monitoreadas:</b>\n\n";
  
  for (const username of accounts) {
    const settings = monitor.monitoredAccounts.get(username);
    const lastTweetId = monitor.lastTweetIds.get(username);
    
    message += `👤 <b>@${username}</b>\n`;
    message += `  📝 Tweets: ${settings.receiveTweets ? "✅" : "❌"}\n`;
    message += `  🔄 Retweets: ${settings.receiveRetweets ? "✅" : "❌"}\n`;
    message += `  📊 Último tweet: ${lastTweetId ? "✅" : "❌"}\n\n`;
  }

  message += `🔧 <i>Modo: Demo/Simulación</i>`;

  await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
}

async function handleUserInfo(chatId) {
  await bot.sendMessage(chatId, 
    "👤 <b>Información de Usuario</b>\n\n" +
    "Envía el nombre de usuario (sin @):",
    { parse_mode: "HTML" }
  );

  bot.once('message', async (reply) => {
    const username = reply.text.trim();
    const twitterAPI = new FreeTwitterAPI();
    
    try {
      const userInfo = await twitterAPI.getUserInfo(username);
      
      if (userInfo.success) {
        const user = userInfo.data;
        const message = `👤 <b>@${user.userName}</b>\n\n` +
          `📝 <b>Nombre:</b> ${user.name}\n` +
          `🆔 <b>ID:</b> ${user.id}\n` +
          `📍 <b>Ubicación:</b> ${user.location}\n` +
          `📄 <b>Descripción:</b> ${user.description}\n` +
          `👥 <b>Seguidores:</b> ${user.followers?.toLocaleString()}\n` +
          `👣 <b>Siguiendo:</b> ${user.following?.toLocaleString()}\n` +
          `📝 <b>Tweets:</b> ${user.statusesCount?.toLocaleString()}\n` +
          `✅ <b>Verificado:</b> ${user.isVerified ? 'Sí' : 'No'}`;
        
        await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
      } else {
        await bot.sendMessage(chatId, `❌ Error: ${userInfo.error}`);
      }
    } catch (error) {
      await bot.sendMessage(chatId, `❌ Error obteniendo información: ${error.message}`);
    }
  });
}

async function handleTestTweet(chatId) {
  try {
    const testTweet = {
      id: Date.now().toString(),
      text: '🧪 Este es un tweet de PRUEBA para demostrar cómo funciona el sistema de notificaciones en tiempo real!',
      createdAt: new Date().toISOString(),
      likeCount: Math.floor(Math.random() * 500),
      retweetCount: Math.floor(Math.random() * 100),
      replyCount: Math.floor(Math.random() * 50),
      isSimulated: true
    };

    const message = `🧪 <b>@testuser</b> publicó (DEMO):\n\n` +
      `💬 ${testTweet.text}\n\n` +
      `📅 ${twitterMonitor.formatDate(testTweet.createdAt)}\n` +
      `❤️ ${testTweet.likeCount} | 🔄 ${testTweet.retweetCount} | 💬 ${testTweet.replyCount}\n\n` +
      `🔧 <i>Así se verán las notificaciones reales</i>`;

    await bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    await bot.sendMessage(chatId, `❌ Error enviando tweet de prueba: ${error.message}`);
  }
}

async function handleSetupAPI(chatId) {
  const setupMessage = `🔧 <b>Configurar API Real de Twitter</b>\n\n` +
    `Para recibir tweets reales (no simulados), necesitas una API de Twitter:\n\n` +
    `<b>🆓 OPCIÓN 1: Twitter API Oficial (GRATIS)</b>\n` +
    `• 500,000 tweets/mes gratis\n` +
    `• Ve a: developer.twitter.com\n` +
    `• Crea una app y obtén Bearer Token\n\n` +
    `<b>💰 OPCIÓN 2: RapidAPI (PAGO)</b>\n` +
    `• Desde $5-10/mes\n` +
    `• Ve a: rapidapi.com\n` +
    `• Busca "Twitter API"\n\n` +
    `<b>🔧 CONFIGURACIÓN:</b>\n` +
    `1. Obtén tu token/key\n` +
    `2. Edita el archivo app.js\n` +
    `3. Reemplaza FreeTwitterAPI por la API real\n` +
    `4. Reinicia el bot\n\n` +
    `<b>💡 ¿Necesitas ayuda?</b>\n` +
    `Te puedo guiar paso a paso para configurar cualquier API.`;

  await bot.sendMessage(chatId, setupMessage, { parse_mode: "HTML" });
}

async function handleHelp(chatId) {
  const helpMessage = `❓ <b>Ayuda - Monitor de Twitter Gratuito</b>\n\n` +
    `<b>🎯 ¿Qué hace esta versión?</b>\n` +
    `• Monitorea cuentas de Twitter\n` +
    `• Obtiene información real de usuarios\n` +
    `• Simula tweets para demostrar funcionalidad\n` +
    `• Te permite probar el sistema completo\n\n` +
    `<b>📋 Comandos disponibles:</b>\n` +
    `/start - Mostrar menú principal\n` +
    `/add usuario - Añadir cuenta\n` +
    `/stats - Ver estadísticas\n\n` +
    `<b>🔄 Cómo funciona:</b>\n` +
    `1. Añade cuentas con /add\n` +
    `2. Inicia el monitor con ▶️\n` +
    `3. Recibe notificaciones simuladas\n` +
    `4. Para tweets reales, configura una API\n\n` +
    `<b>🔧 Limitaciones de la versión gratuita:</b>\n` +
    `• Tweets simulados (no reales)\n` +
    `• Verificación cada minuto (no 30s)\n` +
    `• Solo información básica de usuarios\n\n` +
    `<b>✅ Lo que SÍ funciona completamente:</b>\n` +
    `• Sistema de monitoreo\n` +
    `• Interfaz de Telegram\n` +
    `• Estadísticas y logs\n` +
    `• Gestión de cuentas\n` +
    `• Notificaciones automáticas`;

  await bot.sendMessage(chatId, helpMessage, { parse_mode: "HTML" });
}

// =========================================================================
// INICIALIZACIÓN
// =========================================================================
console.log('🤖 Twitter Monitor Bot - Versión Gratuita');
console.log('=====================================');
console.log('📊 Configuración:');
console.log(`   • Bot Token: ${telegram.botToken.substring(0, 10)}...`);
console.log(`   • Chat ID: ${telegram.chatId}`);
console.log(`   • Archivo de datos: ${monitor.dataFile}`);
console.log(`   • Archivo de logs: ${monitor.logFile}`);
console.log(`   • Modo: Demo/Simulación`);

bot.on('polling_error', (error) => {
  monitor.log(`Error de polling: ${error.message}`, 'ERROR');
});

process.on('SIGINT', () => {
  monitor.log('🛑 Bot detenido por usuario');
  if (monitor.isMonitorActive) {
    twitterMonitor.pauseMonitoring();
  }
  monitor.saveData();
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  monitor.log(`💥 Error no manejado: ${error.message}`, 'ERROR');
  monitor.saveData();
});

monitor.log('🚀 Twitter Monitor Bot (Versión Gratuita) iniciado');
monitor.log(`📱 Cuentas cargadas: ${monitor.getMonitoredAccounts().length}`);

console.log('\n✅ Bot iniciado correctamente!');
console.log('📱 Envía /start a tu bot para comenzar');
console.log('🧪 Esta versión usa simulaciones para demo');
console.log('🔧 Para tweets reales, configura una API de Twitter');
console.log('\n🎯 Funciones disponibles:');
console.log('   • /start - Menú principal');
console.log('   • /add usuario - Añadir cuenta');
console.log('   • /stats - Ver estadísticas');
console.log('   • ▶️ Iniciar monitor (simulado)');
console.log('   • 🧪 Tweet de prueba');
console.log('\n💡 Los tweets serán simulados hasta configurar API real\n');