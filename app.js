"use strict";

const axios = require('axios');
const TelegramBotAPI = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');

// =========================================================================
// CONFIGURACIÓN
// =========================================================================
const CONFIG = {
  twitter: {
    apiKey: 'ad51503f2c64404687aa1452839681cd',
    baseUrl: 'https://api.twitterapi.io',
    timeout: 15000
  },
  telegram: {
    botToken: "7325587317:AAEi3O2F2CckkIeOnmJkqXxcxRTxfNikqOQ",
    chatId: "-1002513153868"
  },
  monitor: {
    checkIntervalMs: 45000,
    maxAccountsPerUser: 20
  }
};

// =========================================================================
// CÓDIGOS DE ESTADO
// =========================================================================
const STATUS_CODES = {
  SYS_INIT: 'SYS-001',
  SYS_READY: 'SYS-002',
  SYS_ERROR: 'SYS-003',
  DB_SAVE: 'DB-001',
  DB_LOAD: 'DB-002',
  TW_USER_FOUND: 'TW-001',
  TW_USER_NOT_FOUND: 'TW-002',
  TW_API_ERROR: 'TW-003',
  MON_START: 'MON-001',
  MON_STOP: 'MON-002',
  MON_CHECK_START: 'MON-003',
  MON_CHECK_END: 'MON-004',
  MON_NEW_TWEET: 'MON-005',
  MON_ERROR: 'MON-006',
  ACC_ADDED: 'ACC-001',
  ACC_REMOVED: 'ACC-002',
  TG_MSG_SENT: 'TG-001',
  TG_MSG_FAILED: 'TG-002',
  TG_COMMAND: 'TG-003'
};

// =========================================================================
// SISTEMA DE LOGGING
// =========================================================================
class Logger {
  constructor() {
    this.logPath = path.resolve('./logs/bot.log');
    this.init();
  }

 async init() {
   try {
     await fs.mkdir(path.dirname(this.logPath), { recursive: true }); // <-- Corregido
     await this.log('INFO', STATUS_CODES.SYS_INIT, 'Logger iniciado');
   }  catch (error) {
     console.error('Error inicializando logger:', error);
   }
 }

  async log(level, code, message, data = null) {
    const timestamp = new Date().toISOString();
    const memory = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const dataStr = data ? ` | DATA: ${JSON.stringify(data)}` : '';
    
    const logEntry = `[${timestamp}] [${level}] [${code}] ${message}${dataStr} | MEM: ${memory}MB`;
    
    console.log(logEntry);
    
    try {
      await fs.appendFile(this.logPath, logEntry + '\n');
    } catch (error) {
      console.error('Error escribiendo log:', error);
    }
  }

  async info(code, message, data) { await this.log('INFO', code, message, data); }
  async warn(code, message, data) { await this.log('WARN', code, message, data); }
  async error(code, message, data) { await this.log('ERROR', code, message, data); }
  async debug(code, message, data) { await this.log('DEBUG', code, message, data); }

  async getRecentLogs(limit = 20) {
    try {
      const content = await fs.readFile(this.logPath, 'utf8');
      const lines = content.split('\n').filter(line => line.trim());
      return lines.slice(-limit);
    } catch (error) {
      return [`Error leyendo logs: ${error.message}`];
    }
  }
}

// =========================================================================
// BASE DE DATOS
// =========================================================================
class Database {
  constructor(logger) {
    this.logger = logger;
    this.dbPath = path.resolve('./data/db.json');
    this.data = {
      users: {},
      accounts: {},
      lastTweetIds: {},
      metrics: {
        totalTweetsProcessed: 0,
        totalErrors: 0,
        totalApiCalls: 0
      }
    };
    this.init();
  }

  async init() {
    try {
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });
      await this.load();
      await this.logger.info(STATUS_CODES.DB_LOAD, 'Base de datos inicializada');
    } catch (error) {
      await this.logger.error(STATUS_CODES.SYS_ERROR, 'Error inicializando BD', { error: error.message });
    }
  }

  async load() {
    try {
      const data = await fs.readFile(this.dbPath, 'utf8');
      
      if (!data.trim()) {
        await this.logger.warn(STATUS_CODES.DB_LOAD, 'Archivo DB vacío, creando nuevo');
        await this.save();
        return;
      }

      const parsedData = JSON.parse(data);
      this.data = { ...this.data, ...parsedData };
      await this.logger.info(STATUS_CODES.DB_LOAD, 'Datos cargados correctamente');
      
    } catch (error) {
      if (error.code === 'ENOENT') {
        await this.logger.info(STATUS_CODES.DB_LOAD, 'Archivo DB no existe, creando nuevo');
        await this.save();
      } else if (error instanceof SyntaxError) {
        await this.handleCorruptedJson();
      } else {
        throw error;
      }
    }
  }

  async handleCorruptedJson() {
    try {
      const backupPath = `${this.dbPath}.backup.${Date.now()}`;
      
      try {
        await fs.copyFile(this.dbPath, backupPath);
        await this.logger.warn(STATUS_CODES.DB_LOAD, 'JSON corrupto, backup creado', { backupPath });
      } catch (backupError) {
        await this.logger.error(STATUS_CODES.DB_LOAD, 'Error creando backup', { error: backupError.message });
      }

      await this.save();
      await this.logger.info(STATUS_CODES.DB_LOAD, 'Nueva base de datos creada');
      
    } catch (error) {
      await this.logger.error(STATUS_CODES.SYS_ERROR, 'Error manejando JSON corrupto', { error: error.message });
      throw error;
    }
  }

  async save() {
    try {
      this.data.lastModified = new Date().toISOString();
      const dataString = JSON.stringify(this.data, null, 2);
      
      const tempPath = `${this.dbPath}.tmp`;
      await fs.writeFile(tempPath, dataString);
      
      JSON.parse(dataString);
      
      await fs.rename(tempPath, this.dbPath);
      
      await this.logger.debug(STATUS_CODES.DB_SAVE, 'Base de datos guardada');
    } catch (error) {
      await this.logger.error(STATUS_CODES.SYS_ERROR, 'Error guardando BD', { error: error.message });
      
      try {
        await fs.unlink(`${this.dbPath}.tmp`);
      } catch (cleanupError) {
        // Ignorar errores de limpieza
      }
      
      throw error;
    }
  }

  async addUser(chatId, userData) {
    this.data.users[chatId] = {
      ...userData,
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };
    await this.save();
  }

  async addAccount(chatId, username, accountData) {
    const accountKey = `${chatId}_${username}`;
    this.data.accounts[accountKey] = {
      chatId,
      username,
      ...accountData,
      addedAt: new Date().toISOString(),
      isActive: false,
      settings: {
        receiveTweets: true,
        receiveRetweets: true
      },
      stats: {
        totalTweetsDetected: 0,
        totalTweetsSent: 0
      }
    };
    await this.save();
    await this.logger.info(STATUS_CODES.ACC_ADDED, 'Cuenta añadida', { chatId, username });
    return accountKey;
  }

  async removeAccount(chatId, username) {
    const accountKey = `${chatId}_${username}`;
    if (this.data.accounts[accountKey]) {
      delete this.data.accounts[accountKey];
      delete this.data.lastTweetIds[username];
      await this.save();
      await this.logger.info(STATUS_CODES.ACC_REMOVED, 'Cuenta eliminada', { chatId, username });
      return true;
    }
    return false;
  }

  getAccountsByUser(chatId) {
    return Object.values(this.data.accounts).filter(account => account.chatId === chatId);
  }

  getAllActiveAccounts() {
    return Object.values(this.data.accounts).filter(account => account.isActive);
  }

  async updateAccountStatus(accountKey, isActive) {
    if (this.data.accounts[accountKey]) {
      this.data.accounts[accountKey].isActive = isActive;
      await this.save();
    }
  }

  async updateLastTweetId(username, tweetId) {
    this.data.lastTweetIds[username] = {
      id: tweetId,
      timestamp: new Date().toISOString()
    };
    await this.save();
  }

  getLastTweetId(username) {
    return this.data.lastTweetIds[username]?.id || null;
  }

  getMetrics() {
    return {
      ...this.data.metrics,
      totalAccounts: Object.keys(this.data.accounts).length,
      totalUsers: Object.keys(this.data.users).length,
      activeAccounts: Object.values(this.data.accounts).filter(a => a.isActive).length
    };
  }
}

// =========================================================================
// CLIENTE TWITTER
// =========================================================================
class TwitterClient {
  constructor(logger) {
    this.logger = logger;
    this.requestCount = 0;
  }

  async makeRequest(endpoint, params = {}) {
    const requestId = ++this.requestCount;
    const startTime = Date.now();

    try {
      await this.logger.debug(STATUS_CODES.TW_API_ERROR, 'Request Twitter API', { 
        endpoint, 
        requestId, 
        params,
        url: `${CONFIG.twitter.baseUrl}${endpoint}`
      });

      const response = await axios.get(`${CONFIG.twitter.baseUrl}${endpoint}`, {
        params,
        headers: { 
          'X-API-Key': CONFIG.twitter.apiKey,
          'Content-Type': 'application/json',
          'User-Agent': 'TwitterNotifyBot/2.0'
        },
        timeout: CONFIG.twitter.timeout,
        validateStatus: function (status) {
          return status >= 200 && status < 500;
        }
      });

      const latency = Date.now() - startTime;

      if (response.status >= 200 && response.status < 300) {
        await this.logger.info(STATUS_CODES.TW_USER_FOUND, 'Request exitoso', {
          endpoint,
          requestId,
          latency,
          status: response.status,
          dataKeys: Object.keys(response.data || {})
        });

        return { success: true, data: response.data, latency, requestId, status: response.status };
      } else {
        await this.logger.error(STATUS_CODES.TW_API_ERROR, 'Error HTTP en Twitter API', {
          endpoint,
          requestId,
          latency,
          status: response.status,
          responseData: response.data,
          headers: response.headers
        });

        return {
          success: false,
          error: `HTTP ${response.status}: ${response.data?.message || response.statusText}`,
          status: response.status,
          responseData: response.data,
          latency,
          requestId
        };
      }

    } catch (error) {
      const latency = Date.now() - startTime;

      let errorDetails = {
        endpoint,
        requestId,
        latency,
        error: error.message,
        code: error.code
      };

      if (error.response) {
        errorDetails.status = error.response.status;
        errorDetails.responseData = error.response.data;
        errorDetails.headers = error.response.headers;
      }

      if (error.response?.status === 402) {
        await this.logger.error(STATUS_CODES.TW_API_ERROR, 'Créditos insuficientes', errorDetails);
      } else if (error.response?.status === 401) {
        await this.logger.error(STATUS_CODES.TW_API_ERROR, 'API Key inválida o expirada', errorDetails);
      } else if (error.response?.status === 404) {
        await this.logger.error(STATUS_CODES.TW_API_ERROR, 'Endpoint no encontrado', errorDetails);
      } else if (error.code === 'ECONNREFUSED') {
        await this.logger.error(STATUS_CODES.TW_API_ERROR, 'Conexión rechazada', errorDetails);
      } else if (error.code === 'ENOTFOUND') {
        await this.logger.error(STATUS_CODES.TW_API_ERROR, 'Servidor no encontrado', errorDetails);
      } else {
        await this.logger.error(STATUS_CODES.TW_API_ERROR, 'Error en Twitter API', errorDetails);
      }

      return {
        success: false,
        error: error.message,
        status: error.response?.status,
        responseData: error.response?.data,
        latency,
        requestId,
        code: error.code
      };
    }
  }

  async getUserInfo(username) {
    const result = await this.makeRequest('/twitter/user/info', { userName: username });
    
    if (result.success && result.data?.data) {
      await this.logger.info(STATUS_CODES.TW_USER_FOUND, 'Usuario encontrado', {
        username,
        userId: result.data.data.id,
        followers: result.data.data.followers,
        fullResponse: result.data
      });
    } else {
      await this.logger.warn(STATUS_CODES.TW_USER_NOT_FOUND, 'Usuario no encontrado', { 
        username,
        status: result.status,
        error: result.error,
        responseData: result.responseData,
        fullResult: result
      });
    }

    return result;
  }

  async getUserTweets(username) {
    const result = await this.makeRequest('/twitter/user/last_tweets', { userName: username });
    
    if (result.success && result.data?.tweets) {
      await this.logger.info(STATUS_CODES.TW_USER_FOUND, 'Tweets obtenidos', {
        username,
        count: result.data.tweets.length,
        fullResponse: result.data
      });
    } else {
      await this.logger.warn(STATUS_CODES.TW_USER_NOT_FOUND, 'Tweets no encontrados', { 
        username,
        status: result.status,
        error: result.error,
        responseData: result.responseData
      });
    }

    return result;
  }

  getHealthMetrics() {
    return {
      requestCount: this.requestCount,
      isHealthy: true
    };
  }
}

// =========================================================================
// MONITOR
// =========================================================================
class TwitterMonitor {
  constructor(logger, database, twitterClient, telegramBot) {
    this.logger = logger;
    this.database = database;
    this.twitterClient = twitterClient;
    this.telegramBot = telegramBot;
    this.isRunning = false;
    this.monitorInterval = null;
    this.metrics = {
      totalChecks: 0,
      tweetsDetected: 0,
      tweetsSent: 0,
      errors: 0,
      startTime: null
    };
  }

  async start() {
    if (this.isRunning) {
      return { success: false, message: 'Monitor ya está ejecutándose' };
    }

    const activeAccounts = this.database.getAllActiveAccounts();
    if (activeAccounts.length === 0) {
      await this.logger.warn(STATUS_CODES.MON_ERROR, 'No hay cuentas activas');
      return { success: false, message: 'No hay cuentas activas para monitorear' };
    }

    this.isRunning = true;
    this.metrics.startTime = new Date();
    
    await this.logger.info(STATUS_CODES.MON_START, 'Monitor iniciado', {
      activeAccounts: activeAccounts.length
    });

    this.startMonitoringLoop();
    
    return { 
      success: true, 
      message: `Monitor iniciado para ${activeAccounts.length} cuentas`,
      accounts: activeAccounts.map(a => a.username)
    };
  }

  async stop() {
    if (!this.isRunning) {
      return { success: false, message: 'Monitor no está ejecutándose' };
    }

    this.isRunning = false;
    
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }

    await this.logger.info(STATUS_CODES.MON_STOP, 'Monitor detenido', {
      totalChecks: this.metrics.totalChecks,
      tweetsDetected: this.metrics.tweetsDetected,
      tweetsSent: this.metrics.tweetsSent
    });

    return { success: true, message: 'Monitor detenido correctamente' };
  }

  startMonitoringLoop() {
    this.monitorInterval = setInterval(async () => {
      if (!this.isRunning) return;
      await this.performCheck();
    }, CONFIG.monitor.checkIntervalMs);

    setTimeout(() => {
      if (this.isRunning) {
        this.performCheck();
      }
    }, 5000);
  }

  async performCheck() {
    const checkStartTime = Date.now();
    const checkId = `check_${Date.now()}`;
    
    try {
      this.metrics.totalChecks++;
      const activeAccounts = this.database.getAllActiveAccounts();
      
      await this.logger.info(STATUS_CODES.MON_CHECK_START, 'Iniciando verificación', {
        checkId,
        accountsToCheck: activeAccounts.length
      });

      let newTweetsFound = 0;
      let errorsInCheck = 0;

      for (const account of activeAccounts) {
        try {
          const result = await this.checkAccount(account, checkId);
          newTweetsFound += result.newTweets;
        } catch (error) {
          errorsInCheck++;
          await this.logger.error(STATUS_CODES.MON_ERROR, 'Error en verificación de cuenta', {
            checkId,
            account: account.username,
            error: error.message
          });
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      const checkDuration = Date.now() - checkStartTime;

      await this.logger.info(STATUS_CODES.MON_CHECK_END, 'Verificación completada', {
        checkId,
        duration: checkDuration,
        newTweetsFound,
        errorsInCheck,
        accountsChecked: activeAccounts.length
      });

      this.metrics.errors += errorsInCheck;

    } catch (error) {
      this.metrics.errors++;
      await this.logger.error(STATUS_CODES.MON_ERROR, 'Error en verificación general', {
        checkId,
        error: error.message
      });
    }
  }

  async checkAccount(account, checkId) {
    const { username, chatId } = account;
    
    try {
      await this.logger.debug(STATUS_CODES.MON_CHECK_START, 'Verificando cuenta', {
        checkId,
        username,
        chatId
      });

      const result = await this.twitterClient.getUserTweets(username);
      
      if (!result.success) {
        await this.logger.warn(STATUS_CODES.MON_ERROR, 'Error obteniendo tweets', {
          checkId,
          username,
          error: result.error
        });
        return { newTweets: 0 };
      }

      const tweets = result.data?.tweets || [];
      const lastKnownTweetId = this.database.getLastTweetId(username);
      const newTweets = this.filterNewTweets(tweets, lastKnownTweetId);

      if (newTweets.length > 0) {
        await this.logger.info(STATUS_CODES.MON_NEW_TWEET, 'Nuevos tweets detectados', {
          checkId,
          username,
          newTweetsCount: newTweets.length
        });

        for (const tweet of newTweets.reverse()) {
          await this.processTweet(tweet, account, checkId);
        }

        await this.database.updateLastTweetId(username, tweets[0].id);
      }

      return { newTweets: newTweets.length };

    } catch (error) {
      await this.logger.error(STATUS_CODES.MON_ERROR, 'Error verificando cuenta', {
        checkId,
        username,
        error: error.message
      });
      
      return { newTweets: 0 };
    }
  }

  filterNewTweets(tweets, lastKnownTweetId) {
    if (!lastKnownTweetId) {
      return tweets.slice(0, 1);
    }

    const newTweets = [];
    for (const tweet of tweets) {
      if (tweet.id === lastKnownTweetId) {
        break;
      }
      newTweets.push(tweet);
    }

    return newTweets.slice(0, 3);
  }

  async processTweet(tweet, account, checkId) {
    try {
      const { username, chatId, settings } = account;
      const isRetweet = tweet.text.startsWith('RT @') || tweet.isRetweet;

      if (isRetweet && !settings.receiveRetweets) return;
      if (!isRetweet && !settings.receiveTweets) return;

      const message = this.formatTweetMessage(tweet, username);
      
      await this.telegramBot.bot.sendMessage(chatId, message, { 
        parse_mode: 'HTML',
        disable_web_page_preview: true 
      });
      
      this.metrics.tweetsDetected++;
      this.metrics.tweetsSent++;

      await this.logger.info(STATUS_CODES.TG_MSG_SENT, 'Tweet enviado', {
        checkId,
        username,
        tweetId: tweet.id,
        chatId
      });

    } catch (error) {
      this.metrics.errors++;
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error procesando tweet', {
        checkId,
        username: account.username,
        tweetId: tweet.id,
        error: error.message
      });
    }
  }

  formatTweetMessage(tweet, username) {
    const isRetweet = tweet.text.startsWith('RT @') || tweet.isRetweet;
    const icon = isRetweet ? "🔄" : "📝";
    const action = isRetweet ? "retwiteó" : "publicó";
    
    let message = `${icon} <b>@${username}</b> ${action}:\n\n`;
    message += `💬 ${tweet.text}\n\n`;
    message += `📅 ${this.formatDate(tweet.createdAt)}\n`;
    message += `❤️ ${this.formatNumber(tweet.likeCount || 0)} | `;
    message += `🔄 ${this.formatNumber(tweet.retweetCount || 0)} | `;
    message += `💬 ${this.formatNumber(tweet.replyCount || 0)}`;
    
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

  formatNumber(num) {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    return (num / 1000000).toFixed(1) + 'M';
  }

  getMetrics() {
    const uptime = this.metrics.startTime ? 
      Math.floor((Date.now() - this.metrics.startTime.getTime()) / 1000) : 0;
    
    return {
      ...this.metrics,
      uptime,
      isRunning: this.isRunning,
      efficiency: this.metrics.tweetsDetected > 0 ? 
        Math.round((this.metrics.tweetsSent / this.metrics.tweetsDetected) * 100) : 100
    };
  }

  formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }
}

// =========================================================================
// BOT DE TELEGRAM
// =========================================================================
class TelegramBot {
  constructor(logger, database, twitterClient, monitor) {
    this.logger = logger;
    this.database = database;
    this.twitterClient = twitterClient;
    this.monitor = monitor;
    this.bot = null;
    this.userStates = new Map();
    this.isInitialized = false;
    
    this.initBot();
  }

  async initBot() {
    try {
      this.bot = new TelegramBotAPI(CONFIG.telegram.botToken, { 
        polling: {
          interval: 1000,
          autoStart: false,
          params: {
            timeout: 10
          }
        }
      });

      this.setupEventHandlers();
      await this.startPolling();
      
    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error inicializando bot', { error: error.message });
      throw error;
    }
  }

  async startPolling() {
    try {
      if (this.isInitialized) {
        await this.logger.warn(STATUS_CODES.TG_MSG_FAILED, 'Bot ya inicializado');
        return;
      }

      try {
        await this.bot.stopPolling();
      } catch (error) {
        // Ignorar errores al detener polling si no estaba iniciado
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await this.bot.startPolling();
      this.isInitialized = true;
      
      await this.logger.info(STATUS_CODES.TG_MSG_SENT, 'Bot de Telegram iniciado correctamente');
      
    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error iniciando polling', { error: error.message });
      
      setTimeout(() => {
        this.startPolling();
      }, 5000);
    }
  }

  setupEventHandlers() {
    this.bot.on('polling_error', async (error) => {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error de polling', { 
        error: error.message,
        code: error.code 
      });
      
      if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
        await this.logger.info(STATUS_CODES.TG_MSG_FAILED, 'Reintentando polling en 10 segundos...');
        
        setTimeout(async () => {
          try {
            this.isInitialized = false;
            await this.startPolling();
          } catch (retryError) {
            await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en reintento', { error: retryError.message });
          }
        }, 10000);
      }
    });

    this.bot.onText(/\/start/, async (msg) => {
      await this.handleStart(msg);
    });

    this.bot.onText(/\/test_api/, async (msg) => {
      await this.handleTestAPI(msg);
    });

    this.bot.onText(/\/add (.+)/, async (msg, match) => {
      await this.handleAddCommand(msg, match[1]);
    });

    this.bot.onText(/\/remove (.+)/, async (msg, match) => {
      await this.handleRemoveCommand(msg, match[1]);
    });

    this.bot.onText(/\/stats/, async (msg) => {
      await this.handleStats(msg);
    });

    this.bot.onText(/\/logs (.*)/, async (msg, match) => {
      await this.handleLogs(msg, match[1] || '20');
    });

    this.bot.onText(/\/health/, async (msg) => {
      await this.handleHealth(msg);
    });

    this.bot.on('callback_query', async (callbackQuery) => {
      await this.handleCallbackQuery(callbackQuery);
    });

    this.bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        await this.handleTextMessage(msg);
      }
    });
  }

  async handleStart(msg) {
    const chatId = msg.chat.id;
    
    try {
      await this.logger.info(STATUS_CODES.TG_COMMAND, 'Comando /start recibido', {
        chatId,
        username: msg.from.username
      });

      if (!this.database.data.users[chatId]) {
        await this.database.addUser(chatId, {
          username: msg.from.username,
          firstName: msg.from.first_name
        });
      }

      const welcomeMessage = `🚀 <b>Twitter Notify Bot v2.0</b>\n\n` +
        `¡Bienvenido al sistema de monitoreo más avanzado!\n\n` +
        `<b>🎯 Características:</b>\n` +
        `• Monitor en tiempo real cada 45 segundos\n` +
        `• Sistema de logs profesional\n` +
        `• Métricas detalladas\n` +
        `• Filtros configurables\n` +
        `• Reintentos automáticos\n\n` +
        `<b>📊 Estado actual:</b>\n` +
        `• Tus cuentas: ${this.database.getAccountsByUser(chatId).length}\n` +
        `• Monitor: ${this.monitor.isRunning ? '🟢 Activo' : '🔴 Inactivo'}\n\n` +
        `👇 <b>Usa el menú para empezar:</b>`;

      await this.sendMessage(chatId, welcomeMessage);
      await this.sendMainMenu(chatId);

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en /start', {
        chatId,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error iniciando el bot.');
    }
  }

  async handleTestAPI(msg) {
    const chatId = msg.chat.id;
    
    try {
      await this.sendMessage(chatId, '🔧 <b>Diagnóstico de API</b>\n\nProbando conexión...');

      // Test 1: Verificar conectividad básica
      await this.sendMessage(chatId, '1️⃣ Verificando URL base...');
      
      try {
        const basicTest = await axios.get(CONFIG.twitter.baseUrl, { 
          timeout: 5000,
          validateStatus: () => true
        });
        
        await this.sendMessage(chatId, 
          `✅ Conexión establecida\n` +
          `📊 Status: ${basicTest.status}\n` +
          `🔗 URL: ${CONFIG.twitter.baseUrl}`
        );
      } catch (error) {
        await this.sendMessage(chatId, 
          `❌ Error de conexión básica:\n` +
          `${error.message}`
        );
        return;
      }

      // Test 2: Probar endpoint con usuario conocido
      await this.sendMessage(chatId, '2️⃣ Probando endpoint de usuario...');
      
      const testUsers = ['elonmusk', 'twitter', 'openai'];
      let apiWorking = false;

      for (const testUser of testUsers) {
        await this.sendMessage(chatId, `🔍 Probando con @${testUser}...`);
        
        const result = await this.twitterClient.makeRequest('/twitter/user/info', { 
          userName: testUser 
        });
        
        if (result.success) {
          await this.sendMessage(chatId, 
            `✅ <b>API funcionando!</b>\n\n` +
            `👤 Usuario: @${testUser}\n` +
            `📊 Status: ${result.status}\n` +
            `⏱️ Latencia: ${result.latency}ms\n` +
            `🔑 Datos recibidos: ${JSON.stringify(Object.keys(result.data || {}))}`
          );
          apiWorking = true;
          break;
        } else {
          await this.sendMessage(chatId, 
            `❌ Error con @${testUser}\n` +
            `📊 Status: ${result.status || 'N/A'}\n` +
            `💬 Error: ${result.error}\n` +
            `📝 Datos: ${JSON.stringify(result.responseData || {})}`
          );
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Resumen final
      if (!apiWorking) {
        await this.sendMessage(chatId, 
          `📋 <b>Resumen del diagnóstico:</b>\n\n` +
          `❌ La API no está funcionando correctamente\n\n` +
          `<b>Posibles causas:</b>\n` +
          `• API Key inválida o expirada\n` +
          `• Sin créditos en la cuenta\n` +
          `• Endpoint incorrecto\n` +
          `• Servicio de API caído\n` +
          `• Límites de rate excedidos\n\n` +
          `<b>Soluciones:</b>\n` +
          `• Verificar API Key en el panel\n` +
          `• Revisar créditos disponibles\n` +
          `• Contactar soporte de la API`
        );
      }

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en test API', {
        chatId,
        error: error.message
      });
      
      await this.sendMessage(chatId, `❌ Error ejecutando diagnóstico: ${error.message}`);
    }
  }

  async handleAddCommand(msg, usernameInput) {
    const chatId = msg.chat.id;
    const username = usernameInput.replace('@', '').trim();
    
    try {
      await this.logger.info(STATUS_CODES.TG_COMMAND, 'Comando /add recibido', {
        chatId,
        username
      });

      await this.addAccount(chatId, username);

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en /add', {
        chatId,
        username,
        error: error.message
      });
      
      await this.sendMessage(chatId, `❌ Error añadiendo cuenta: ${error.message}`);
    }
  }

  async handleRemoveCommand(msg, usernameInput) {
    const chatId = msg.chat.id;
    const username = usernameInput.replace('@', '').trim();
    
    try {
      const success = await this.database.removeAccount(chatId, username);
      
      if (success) {
        await this.sendMessage(chatId, `✅ Cuenta @${username} eliminada correctamente.`);
      } else {
        await this.sendMessage(chatId, `❌ Cuenta @${username} no encontrada.`);
      }

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en /remove', {
        chatId,
        username,
        error: error.message
      });
      
      await this.sendMessage(chatId, `❌ Error eliminando cuenta.`);
    }
  }

  async handleStats(msg) {
    const chatId = msg.chat.id;
    
    try {
      const monitorMetrics = this.monitor.getMetrics();
      const dbMetrics = this.database.getMetrics();
      const twitterMetrics = this.twitterClient.getHealthMetrics();
      const userAccounts = this.database.getAccountsByUser(chatId);

      const statsMessage = `📊 <b>Estadísticas Detalladas</b>\n\n` +
        `<b>🤖 Monitor:</b>\n` +
        `• Estado: ${monitorMetrics.isRunning ? '🟢 Activo' : '🔴 Inactivo'}\n` +
        `• Tiempo activo: ${this.monitor.formatUptime(monitorMetrics.uptime)}\n` +
        `• Verificaciones: ${monitorMetrics.totalChecks}\n` +
        `• Tweets detectados: ${monitorMetrics.tweetsDetected}\n` +
        `• Tweets enviados: ${monitorMetrics.tweetsSent}\n` +
        `• Errores: ${monitorMetrics.errors}\n` +
        `• Eficiencia: ${monitorMetrics.efficiency}%\n\n` +
        `<b>📱 Tus cuentas:</b>\n` +
        `• Total: ${userAccounts.length}\n` +
        `• Activas: ${userAccounts.filter(a => a.isActive).length}\n\n` +
        `<b>🌐 Twitter API:</b>\n` +
        `• Requests: ${twitterMetrics.requestCount}\n` +
        `• Salud: ${twitterMetrics.isHealthy ? '✅ Buena' : '⚠️ Degradada'}\n\n` +
        `<b>💾 Base de datos:</b>\n` +
        `• Usuarios: ${dbMetrics.totalUsers}\n` +
        `• Cuentas: ${dbMetrics.totalAccounts}\n` +
        `• Activas: ${dbMetrics.activeAccounts}`;

      await this.sendMessage(chatId, statsMessage);

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en /stats', {
        chatId,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error obteniendo estadísticas.');
    }
  }

  async handleLogs(msg, limitStr) {
    const chatId = msg.chat.id;
    const limit = Math.min(parseInt(limitStr) || 20, 30);
    
    try {
      const recentLogs = await this.logger.getRecentLogs(limit);
      
      if (recentLogs.length === 0) {
        await this.sendMessage(chatId, '📋 No hay logs disponibles.');
        return;
      }

      let logsMessage = `📋 <b>Últimos ${limit} logs:</b>\n\n<code>`;
      
      recentLogs.forEach(log => {
        const truncatedLog = log.length > 120 ? log.substring(0, 120) + '...' : log;
        logsMessage += truncatedLog + '\n';
      });
      
      logsMessage += '</code>';
      
      await this.sendMessage(chatId, logsMessage);

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en /logs', {
        chatId,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error obteniendo logs.');
    }
  }

  async handleHealth(msg) {
    const chatId = msg.chat.id;
    
    try {
      const twitterHealth = this.twitterClient.getHealthMetrics();
      const monitorMetrics = this.monitor.getMetrics();
      
      const healthMessage = `🏥 <b>Estado de Salud del Sistema</b>\n\n` +
        `<b>🐦 Twitter API:</b>\n` +
        `• Salud: ${twitterHealth.isHealthy ? '✅ Buena' : '⚠️ Degradada'}\n` +
        `• Requests: ${twitterHealth.requestCount}\n\n` +
        `<b>📡 Monitor:</b>\n` +
        `• Estado: ${monitorMetrics.isRunning ? '🟢 Funcionando' : '🔴 Detenido'}\n` +
        `• Verificaciones: ${monitorMetrics.totalChecks}\n` +
        `• Eficiencia: ${monitorMetrics.efficiency}%\n\n` +
        `<b>💻 Sistema:</b>\n` +
        `• Uptime: ${this.monitor.formatUptime(process.uptime())}\n` +
        `• Memoria: ${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB\n` +
        `• Node.js: ${process.version}`;

      await this.sendMessage(chatId, healthMessage);

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en /health', {
        chatId,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error obteniendo estado de salud.');
    }
  }

  async sendMainMenu(chatId) {
    const userAccounts = this.database.getAccountsByUser(chatId);
    const monitorMetrics = this.monitor.getMetrics();
    
    const menuMessage = `🎛️ <b>Panel de Control</b>\n\n` +
      `📊 <b>Estado:</b> ${monitorMetrics.isRunning ? '🟢 Activo' : '🔴 Inactivo'}\n` +
      `📱 <b>Tus cuentas:</b> ${userAccounts.length}\n` +
      `📝 <b>Tweets enviados:</b> ${monitorMetrics.tweetsSent}\n\n` +
      `Selecciona una opción:`;

    const keyboard = {
      inline_keyboard: [
        [
          { 
            text: monitorMetrics.isRunning ? "⏸️ Pausar Monitor" : "▶️ Iniciar Monitor", 
            callback_data: monitorMetrics.isRunning ? "pause_monitor" : "start_monitor" 
          }
        ],
        [
          { text: "➕ Añadir Cuenta", callback_data: "add_account" },
          { text: "📱 Gestionar Cuentas", callback_data: "manage_accounts" }
        ],
        [
          { text: "📊 Estadísticas", callback_data: "full_stats" },
          { text: "🏥 Estado Salud", callback_data: "health_check" }
        ],
        [
          { text: "🔧 Test API", callback_data: "test_api" },
          { text: "📋 Ver Logs", callback_data: "view_logs" }
        ],
        [
          { text: "❓ Ayuda", callback_data: "help" }
        ]
      ]
    };

    try {
      await this.bot.sendMessage(chatId, menuMessage, {
        parse_mode: 'HTML',
        reply_markup: keyboard
      });
    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error enviando menú', {
        chatId,
        error: error.message
      });
    }
  }

  async handleCallbackQuery(callbackQuery) {
    const chatId = callbackQuery.message.chat.id;
    const data = callbackQuery.data;

    try {
      await this.logger.info(STATUS_CODES.TG_COMMAND, 'Callback recibido', { chatId, data });

      switch (data) {
        case 'start_monitor':
          await this.handleStartMonitor(chatId);
          break;
        case 'pause_monitor':
          await this.handlePauseMonitor(chatId);
          break;
        case 'add_account':
          await this.handleAddAccountFlow(chatId);
          break;
        case 'manage_accounts':
          await this.handleManageAccounts(chatId);
          break;
        case 'full_stats':
          await this.handleStats({ chat: { id: chatId } });
          break;
        case 'health_check':
          await this.handleHealth({ chat: { id: chatId } });
          break;
        case 'test_api':
          await this.handleTestAPI({ chat: { id: chatId } });
          break;
        case 'view_logs':
          await this.handleLogs({ chat: { id: chatId } }, '20');
          break;
        case 'help':
          await this.handleHelp(chatId);
          break;
        default:
          await this.sendMessage(chatId, '❓ Opción no reconocida.');
      }

      await this.bot.answerCallbackQuery(callbackQuery.id);
      setTimeout(() => this.sendMainMenu(chatId), 3000);

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error en callback', {
        chatId,
        data,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error procesando solicitud.');
      await this.bot.answerCallbackQuery(callbackQuery.id);
    }
  }

  async handleStartMonitor(chatId) {
    try {
      const userAccounts = this.database.getAccountsByUser(chatId);
      for (const account of userAccounts) {
        const accountKey = `${chatId}_${account.username}`;
        await this.database.updateAccountStatus(accountKey, true);
      }

      const result = await this.monitor.start();
      
      if (result.success) {
        await this.sendMessage(chatId, 
          `✅ <b>Monitor iniciado exitosamente</b>\n\n` +
          `📱 Cuentas monitoreadas: ${result.accounts.length}\n` +
          `🔄 Verificando cada 45 segundos\n` +
          `🔔 Recibirás notificaciones automáticas\n\n` +
          `<i>Cuentas: ${result.accounts.map(a => '@' + a).join(', ')}</i>`
        );
      } else {
        await this.sendMessage(chatId, `❌ ${result.message}`);
      }
      
    } catch (error) {
      await this.logger.error(STATUS_CODES.MON_ERROR, 'Error iniciando monitor', {
        chatId,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error iniciando el monitor.');
    }
  }

  async handlePauseMonitor(chatId) {
    try {
      const result = await this.monitor.stop();
      
      if (result.success) {
        await this.sendMessage(chatId, 
          `⏸️ <b>Monitor pausado correctamente</b>\n\n` +
          `📊 Estadísticas de la sesión:\n` +
          `• Verificaciones: ${this.monitor.metrics.totalChecks}\n` +
          `• Tweets detectados: ${this.monitor.metrics.tweetsDetected}\n` +
          `• Tweets enviados: ${this.monitor.metrics.tweetsSent}\n` +
          `• Errores: ${this.monitor.metrics.errors}\n\n` +
          `▶️ Usa "Iniciar Monitor" para reanudar`
        );
      } else {
        await this.sendMessage(chatId, `❌ ${result.message}`);
      }
      
    } catch (error) {
      await this.logger.error(STATUS_CODES.MON_ERROR, 'Error pausando monitor', {
        chatId,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error pausando el monitor.');
    }
  }

  async handleAddAccountFlow(chatId) {
    await this.sendMessage(chatId, 
      `➕ <b>Añadir Nueva Cuenta</b>\n\n` +
      `Envía el nombre de usuario (sin @)\n` +
      `Ejemplo: <code>elonmusk</code>\n\n` +
      `O usa: <code>/add usuario</code>`
    );
    
    this.userStates.set(chatId, { 
      state: 'waiting_username',
      timestamp: Date.now()
    });
  }

  async handleManageAccounts(chatId) {
    const userAccounts = this.database.getAccountsByUser(chatId);
    
    if (userAccounts.length === 0) {
      await this.sendMessage(chatId, 
        `📱 <b>No tienes cuentas monitoreadas</b>\n\n` +
        `Usa "➕ Añadir Cuenta" para empezar.`
      );
      return;
    }

    let message = `📱 <b>Cuentas (${userAccounts.length})</b>\n\n`;
    
    userAccounts.forEach((account, index) => {
      const statusIcon = account.isActive ? '🟢' : '🔴';
      const tweetsIcon = account.settings.receiveTweets ? '📝✅' : '📝❌';
      const retweetsIcon = account.settings.receiveRetweets ? '🔄✅' : '🔄❌';
      
      message += `${statusIcon} <b>@${account.username}</b>\n`;
      message += `   ${tweetsIcon} ${retweetsIcon}\n`;
      message += `   📊 Enviados: ${account.stats.totalTweetsSent || 0}\n`;
      message += `   📅 ${new Date(account.addedAt).toLocaleDateString('es-ES')}\n\n`;
    });

    message += `💡 <b>Comandos:</b>\n`;
    message += `• <code>/remove usuario</code> - Eliminar\n`;
    message += `• <code>/add usuario</code> - Añadir`;

    await this.sendMessage(chatId, message);
  }

  async handleHelp(chatId) {
    const helpMessage = `❓ <b>Ayuda - Twitter Notify Bot</b>\n\n` +
      `<b>📋 Comandos:</b>\n` +
      `• <code>/start</code> - Menú principal\n` +
      `• <code>/add usuario</code> - Añadir cuenta\n` +
      `• <code>/remove usuario</code> - Eliminar cuenta\n` +
      `• <code>/stats</code> - Estadísticas completas\n` +
      `• <code>/logs [número]</code> - Ver logs\n` +
      `• <code>/health</code> - Estado del sistema\n` +
      `• <code>/test_api</code> - Diagnosticar API\n\n` +
      `<b>🔄 Uso:</b>\n` +
      `1. Añade cuentas con /add\n` +
      `2. Inicia monitor con ▶️\n` +
      `3. Recibe notificaciones cada 45s\n` +
      `4. Monitorea con /stats\n` +
      `5. Pausa cuando necesites\n\n` +
      `<b>⚙️ Características:</b>\n` +
      `• Logs detallados automáticos\n` +
      `• Reintentos ante errores\n` +
      `• Backup de base de datos\n` +
      `• Monitoreo de rendimiento\n` +
      `• Filtros configurables`;

    await this.sendMessage(chatId, helpMessage);
  }

  async handleTextMessage(msg) {
    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const userState = this.userStates.get(chatId);

    if (!userState) return;

    if (Date.now() - userState.timestamp > 300000) {
      this.userStates.delete(chatId);
      await this.sendMessage(chatId, '⏰ Tiempo agotado. Usa el menú de nuevo.');
      return;
    }

    try {
      switch (userState.state) {
        case 'waiting_username':
          await this.addAccount(chatId, text);
          break;
        default:
          await this.sendMessage(chatId, '❓ Estado no reconocido.');
      }
    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error procesando texto', {
        chatId,
        state: userState.state,
        error: error.message
      });
      
      await this.sendMessage(chatId, '❌ Error procesando mensaje.');
    } finally {
      this.userStates.delete(chatId);
    }
  }

  async addAccount(chatId, username) {
    try {
      await this.logger.info(STATUS_CODES.ACC_ADDED, 'Añadiendo cuenta', { chatId, username });

      const userAccounts = this.database.getAccountsByUser(chatId);
      if (userAccounts.length >= CONFIG.monitor.maxAccountsPerUser) {
        await this.sendMessage(chatId, 
          `❌ Límite alcanzado (${CONFIG.monitor.maxAccountsPerUser} cuentas máximo).`
        );
        return;
      }

      const exists = userAccounts.find(acc => acc.username.toLowerCase() === username.toLowerCase());
      if (exists) {
        await this.sendMessage(chatId, `⚠️ Ya monitorieas @${username}.`);
        return;
      }

      await this.sendMessage(chatId, `🔍 Verificando @${username}...`);

      const userResult = await this.twitterClient.getUserInfo(username);
      
      if (!userResult.success) {
        const errorDetails = userResult.responseData ? 
          `\n\n<b>Detalles del error:</b>\n<code>${JSON.stringify(userResult.responseData, null, 2)}</code>` : '';
        
        await this.sendMessage(chatId, 
          `❌ Usuario @${username} no encontrado.\n\n` +
          `<b>Status HTTP:</b> ${userResult.status || 'N/A'}\n` +
          `<b>Error:</b> ${userResult.error || 'Desconocido'}\n\n` +
          `<b>Posibles causas:</b>\n` +
          `• Usuario no existe o cuenta suspendida\n` +
          `• Problemas con la API de Twitter\n` +
          `• API Key sin créditos o inválida\n` +
          `• Límites de rate excedidos\n\n` +
          `💡 Usa <code>/test_api</code> para diagnosticar` +
          errorDetails
        );
        return;
      }

      const userData = userResult.data.data;
      
      await this.database.addAccount(chatId, username, {
        name: userData.name,
        userId: userData.id,
        followers: userData.followers,
        verified: userData.isVerified || userData.isBlueVerified
      });

      const successMessage = `✅ <b>@${username} añadido</b>\n\n` +
        `👤 <b>Nombre:</b> ${userData.name}\n` +
        `🆔 <b>ID:</b> ${userData.id}\n` +
        `👥 <b>Seguidores:</b> ${this.formatNumber(userData.followers || 0)}\n` +
        `✅ <b>Verificado:</b> ${(userData.isVerified || userData.isBlueVerified) ? 'Sí' : 'No'}\n\n` +
        `🔔 Será monitoreado al iniciar el monitor.`;

      await this.sendMessage(chatId, successMessage);

    } catch (error) {
      await this.logger.error(STATUS_CODES.ACC_ADDED, 'Error añadiendo cuenta', {
        chatId,
        username,
        error: error.message
      });
      
      await this.sendMessage(chatId, `❌ Error añadiendo @${username}: ${error.message}`);
    }
  }

  async sendMessage(chatId, text, options = {}) {
    try {
      const defaultOptions = {
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        ...options
      };

      await this.bot.sendMessage(chatId, text, defaultOptions);
      
      await this.logger.debug(STATUS_CODES.TG_MSG_SENT, 'Mensaje enviado', { chatId });

    } catch (error) {
      await this.logger.error(STATUS_CODES.TG_MSG_FAILED, 'Error enviando mensaje', {
        chatId,
        error: error.message
      });
      throw error;
    }
  }

  formatNumber(num) {
    if (num < 1000) return num.toString();
    if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
    return (num / 1000000).toFixed(1) + 'M';
  }
}

// =========================================================================
// APLICACIÓN PRINCIPAL
// =========================================================================
class TwitterMonitorApp {
  constructor() {
    this.logger = null;
    this.database = null;
    this.twitterClient = null;
    this.monitor = null;
    this.telegramBot = null;
    this.isShuttingDown = false;
  }

  async init() {
    try {
      console.log('🚀 Iniciando Twitter Notify Bot v2.0\n');

      console.log('🔍 Verificando instancias existentes...');

      this.logger = new Logger();
      await this.logger.info(STATUS_CODES.SYS_INIT, 'Iniciando sistema');

      this.database = new Database(this.logger);
      this.twitterClient = new TwitterClient(this.logger);
      
      this.telegramBot = new TelegramBot(this.logger, this.database, this.twitterClient, null);
      
      this.monitor = new TwitterMonitor(this.logger, this.database, this.twitterClient, this.telegramBot);
      
      this.telegramBot.monitor = this.monitor;

      this.setupErrorHandling();

      await this.logger.info(STATUS_CODES.SYS_READY, 'Sistema iniciado correctamente');

      console.log('✅ Sistema iniciado correctamente!');
      console.log(`📊 Cuentas: ${this.database.getMetrics().totalAccounts}`);
      console.log(`👥 Usuarios: ${this.database.getMetrics().totalUsers}`);
      console.log(`📱 Bot: @TusTwitterNotificaciones_bot`);
      console.log(`📋 Logs: ./logs/bot.log`);
      console.log(`💾 BD: ./data/db.json`);
      console.log('\n🎯 Comandos:');
      console.log('   • /start - Menú principal');
      console.log('   • /add usuario - Añadir cuenta');
      console.log('   • /test_api - Diagnosticar API');
      console.log('   • /stats - Estadísticas');
      console.log('   • /health - Estado sistema');
      console.log('   • /logs - Ver logs');
      console.log('\n💡 ¡Listo para usar!\n');

    } catch (error) {
      console.error('💥 Error fatal:', error);
      if (this.logger) {
        await this.logger.error(STATUS_CODES.SYS_ERROR, 'Error fatal', { error: error.message });
      }
      throw error;
    }
  }

  setupErrorHandling() {
    process.on('SIGINT', async () => {
      if (!this.isShuttingDown) {
        console.log('\n🛑 Cerrando sistema...');
        await this.shutdown();
      }
    });

    process.on('uncaughtException', async (error) => {
      console.error('💥 Excepción no capturada:', error);
      if (this.logger && !this.isShuttingDown) {
        await this.logger.error(STATUS_CODES.SYS_ERROR, 'Excepción no capturada', { error: error.message });
      }
      await this.shutdown();
      process.exit(1);
    });

    process.on('unhandledRejection', async (reason) => {
      console.error('💥 Promesa rechazada:', reason);
      if (this.logger && !this.isShuttingDown) {
        await this.logger.error(STATUS_CODES.SYS_ERROR, 'Promesa rechazada', { reason: reason.toString() });
      }
    });
  }

  async shutdown() {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    try {
      console.log('🔄 Cerrando...');
      
      if (this.telegramBot && this.telegramBot.bot) {
        try {
          await this.telegramBot.bot.stopPolling();
          console.log('✅ Bot de Telegram detenido');
        } catch (error) {
          console.log('⚠️ Error deteniendo bot:', error.message);
        }
      }

      if (this.monitor && this.monitor.isRunning) {
        await this.monitor.stop();
      }

      if (this.database) {
        await this.database.save();
      }

      if (this.logger) {
        await this.logger.info(STATUS_CODES.SYS_READY, 'Sistema cerrado');
      }

      console.log('✅ Sistema cerrado correctamente');
      process.exit(0);

    } catch (error) {
      console.error('❌ Error durante cierre:', error);
      process.exit(1);
    }
  }

  async start() {
    await this.init();
  }
}

// =========================================================================
// PUNTO DE ENTRADA
// =========================================================================
if (require.main === module) {
  const app = new TwitterMonitorApp();
  
  app.start().catch(async (error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
}

module.exports = {
  TwitterMonitorApp,
  Logger,
  Database,
  TwitterClient,
  TwitterMonitor,
  TelegramBot,
  CONFIG,
  STATUS_CODES
};