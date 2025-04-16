"use strict";

const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// -------------------------
// Configuración de APIs
// -------------------------
const API_KEY = 'ad51503f2c64404687aa1452839681cd';
const BASE_URL = 'https://api.twitterapi.io'; // Verifica que este endpoint sea el correcto

const telegram = {
  botToken: "7325587317:AAEi3O2F2CckkIeOnmJkqXxcxRTxfNikqOQ",
  chatId: "-1002513153868"
};

// -------------------------
// Configuración del Bot de Telegram
// -------------------------
const bot = new TelegramBot(telegram.botToken, { polling: true });

/**
 * Envía el menú principal con formato bonito y emojis.
 */
function sendTelegramMenu(chatId) {
  const menuMessage = "<b>🎯 Menú de Twitter API</b>\nElige una opción:";
  const options = {
    reply_markup: {
      inline_keyboard: [
        [
          { text: "🔍 Advanced Search (@menciones)", callback_data: "advancedSearch" },
          { text: "📊 Batch Get User Info", callback_data: "batchGetUserInfo" }
        ],
        [
          { text: "👤 Get User Info", callback_data: "getUserInfo" },
          { text: "📝 Get User Last Tweets", callback_data: "getUserLastTweets" }
        ],
        [
          { text: "👥 Get User Followers", callback_data: "getUserFollowers" },
          { text: "👣 Get User Followings", callback_data: "getUserFollowings" }
        ],
        [
          { text: "💬 Get User Mentions", callback_data: "getUserMentions" },
          { text: "💭 Get Tweet Replies", callback_data: "getTweetReplies" }
        ],
        [
          { text: "❝ Get Tweet Quotations", callback_data: "getTweetQuotations" },
          { text: "🔄 Get Tweet Retweeters", callback_data: "getTweetRetweeters" }
        ],
        [
          { text: "📋 Get List Tweets", callback_data: "getListTweets" },
          { text: "📡 Monitor Tweet c/ Filtros", callback_data: "monitorTweetFilters" }
        ],
        [
          { text: "🔔 Filtrar en Tiempo Real", callback_data: "filterRealtimeTweets" }
        ],
        [
          { text: "🚪 Salir", callback_data: "exit" }
        ]
      ]
    }
  };
  bot.sendMessage(chatId, menuMessage, { parse_mode: "HTML", ...options });
}

/**
 * Función auxiliar para tratar valores opcionales (por ejemplo, cursor o sinceTime).
 * Si el usuario ingresa "1" se interpreta que se omite el valor (cadena vacía).
 */
function getOptionalValue(input) {
  return (input.trim() === "1") ? "" : input.trim();
}

// =============================================================================
// Funciones existentes (Opciones 1 a 11 y Monitor Tweet c/ Filtros)
// =============================================================================

// 1. Advanced Search - Buscar menciones (@usuario)
async function advancedSearch_Telegram(chatId) {
  bot.sendMessage(chatId, "🔎 <b> Advanced Search </b>\n Ingrese el <b> usuario </b> de Twitter (sin @):")
    .then(() => {
      bot.once('message', async (reply) => {
        const username = reply.text.trim();
        try {
          const response = await axios.get(`${BASE_URL}/twitter/tweet/advanced_search`, {
            params: { query: `@${username}`, queryType: 'Latest' },
            headers: { 'X-API-Key': API_KEY }
          });
          const tweets = response.data.tweets;
          if (!tweets || tweets.length === 0) {
            bot.sendMessage(chatId, `⚠️ No se encontraron tweets que mencionen a <b>@${username}</b>.`);
            return sendTelegramMenu(chatId);
          }
          let message = `<b>📢 Tweets que mencionan a @${username}:</b>\n\n`;
          tweets.slice(0, 10).forEach((tweet, index) => {
            message += `<b>Tweet ${index + 1}:</b>\n`;
            message += `• <b>ID:</b> ${tweet.id}\n`;
            message += `• <b>Texto:</b> ${tweet.text}\n`;
            message += `• <b>URL:</b> <a href="${tweet.url}">Ver</a>\n`;
            message += `• <b>Creado:</b> ${tweet.createdAt}\n`;
            message += `• <b>Retweets:</b> ${tweet.retweetCount} | <b>Likes:</b> ${tweet.likeCount}\n\n`;
          });
          bot.sendMessage(chatId, message, { parse_mode: "HTML" });
        } catch (error) {
          const errMsg = `❌ <b>Error en Advanced Search:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
          bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
        }
        sendTelegramMenu(chatId);
      });
    });
}

// 2. Batch Get User Info By UserIds
async function batchGetUserInfo_Telegram(chatId) {
  bot.sendMessage(chatId, "👥 <b>Batch Get User Info</b>\nIngrese los <b>userIds</b> separados por comas (sin espacios):")
    .then(() => {
      bot.once('message', async (reply) => {
        const userIds = reply.text.trim();
        try {
          const response = await axios.get(`${BASE_URL}/twitter/user/batch_info_by_ids`, {
            params: { userIds },
            headers: { 'X-API-Key': API_KEY }
          });
          const users = response.data.users;
          if (!users || users.length === 0) {
            bot.sendMessage(chatId, "⚠️ No se encontraron usuarios.");
            return sendTelegramMenu(chatId);
          }
          let message = `<b>📊 Información de usuarios:</b>\n\n`;
          users.forEach(user => {
            message += `• <b>Nombre:</b> ${user.name}\n`;
            message += `• <b>Usuario:</b> @${user.userName}\n`;
            message += `• <b>ID:</b> ${user.id}\n`;
            message += `• <b>Localización:</b> ${user.location || "No especificada"}\n`;
            message += `• <b>Seguidores:</b> ${user.followers} | <b>Siguiendo:</b> ${user.following}\n\n`;
          });
          bot.sendMessage(chatId, message, { parse_mode: "HTML" });
        } catch (error) {
          const errMsg = `❌ <b>Error Batch Get User Info:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
          bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
        }
        sendTelegramMenu(chatId);
      });
    });
}

// 3. Get User Info (por usuario)
async function getUserInfo_Telegram(chatId) {
  bot.sendMessage(chatId, "👤 <b>Get User Info</b>\nIngrese el <b>usuario</b> de Twitter (sin @):")
    .then(() => {
      bot.once('message', async (reply) => {
        const userName = reply.text.trim();
        try {
          const response = await axios.get(`${BASE_URL}/twitter/user/info`, {
            params: { userName },
            headers: { 'X-API-Key': API_KEY }
          });
          const data = response.data.data;
          if (!data) {
            bot.sendMessage(chatId, "⚠️ No se encontró información para el usuario.");
            return sendTelegramMenu(chatId);
          }
          let message = `<b>📝 Información del usuario:</b>\n`;
          message += `• <b>Nombre:</b> ${data.name}\n`;
          message += `• <b>Usuario:</b> @${data.userName}\n`;
          message += `• <b>ID:</b> ${data.id}\n`;
          message += `• <b>Localización:</b> ${data.location}\n`;
          message += `• <b>Descripción:</b> ${data.description}\n`;
          message += `• <b>Seguidores:</b> ${data.followers} | <b>Siguiendo:</b> ${data.following}\n`;
          message += `• <b>Tweets:</b> ${data.statusesCount}\n`;
          message += `• <b>Creado:</b> ${data.createdAt}\n`;
          message += `• <b>Verificado:</b> ${(data.isVerified || data.isBlueVerified) ? "✅ Sí" : "❌ No"}`;
          bot.sendMessage(chatId, message, { parse_mode: "HTML" });
        } catch (error) {
          const errMsg = `❌ <b>Error en Get User Info:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
          bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
        }
        sendTelegramMenu(chatId);
      });
    });
}

// 4. Get User Last Tweets
async function getUserLastTweets_Telegram(chatId) {
  bot.sendMessage(chatId, "📝 <b>Get User Last Tweets</b>\nSeleccione:\n1. Buscar por <b>userId</b>\n2. Buscar por <b>usuario</b> (sin @)")
    .then(() => {
      bot.once('message', async (reply) => {
        const option = reply.text.trim();
        let params = {};
        if (option === '1') {
          bot.sendMessage(chatId, "Ingrese el <b>userId</b>:")
            .then(() => {
              bot.once('message', async (r2) => {
                params.userId = r2.text.trim();
                await executeGetUserLastTweets(params, chatId);
                sendTelegramMenu(chatId);
              });
            });
        } else if (option === '2') {
          bot.sendMessage(chatId, "Ingrese el <b>usuario</b> (sin @):")
            .then(() => {
              bot.once('message', async (r2) => {
                params.userName = r2.text.trim();
                await executeGetUserLastTweets(params, chatId);
                sendTelegramMenu(chatId);
              });
            });
        } else {
          bot.sendMessage(chatId, "⚠️ Opción no válida.");
          sendTelegramMenu(chatId);
        }
      });
    });
}
async function executeGetUserLastTweets(params, chatId) {
  try {
    const response = await axios.get(`${BASE_URL}/twitter/user/last_tweets`, {
      params,
      headers: { 'X-API-Key': API_KEY }
    });
    const tweets = response.data.tweets;
    if (!tweets || tweets.length === 0) {
      bot.sendMessage(chatId, "⚠️ No se encontraron tweets recientes.");
      return;
    }
    let message = `<b>📰 Últimos Tweets:</b>\n\n`;
    tweets.forEach((tweet, index) => {
      message += `<b>Tweet ${index + 1}:</b>\n`;
      message += `• <b>ID:</b> ${tweet.id}\n`;
      message += `• <b>Texto:</b> ${tweet.text}\n`;
      message += `• <b>Fecha:</b> ${tweet.createdAt}\n`;
      message += `• <b>Likes:</b> ${tweet.likeCount} | <b>Retweets:</b> ${tweet.retweetCount} | <b>Respuestas:</b> ${tweet.replyCount}\n\n`;
    });
    bot.sendMessage(chatId, message, { parse_mode: "HTML" });
  } catch (error) {
    const errMsg = `❌ <b>Error en Get User Last Tweets:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
    bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
  }
}

// 5. Get User Followers
async function getUserFollowers_Telegram(chatId) {
  bot.sendMessage(chatId, "👥 <b>Get User Followers</b>\nIngrese el <b>usuario</b> (sin @):")
    .then(() => {
      bot.once('message', async (reply) => {
        const userName = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese el <b>cursor</b> (escribe '1' para la primera página):")
          .then(() => {
            bot.once('message', async (r2) => {
              const cursor = getOptionalValue(r2.text);
              try {
                const response = await axios.get(`${BASE_URL}/twitter/user/followers`, {
                  params: { userName, cursor },
                  headers: { 'X-API-Key': API_KEY }
                });
                const followers = response.data.followers;
                if (!followers || followers.length === 0) {
                  bot.sendMessage(chatId, "⚠️ No se encontraron seguidores.");
                  return sendTelegramMenu(chatId);
                }
                let message = `<b>👥 Seguidores de @${userName}:</b>\n\n`;
                followers.forEach(follower => {
                  message += `• <b>Nombre:</b> ${follower.name}\n`;
                  message += `• <b>Usuario:</b> @${follower.userName}\n`;
                  message += `• <b>ID:</b> ${follower.id}\n\n`;
                });
                bot.sendMessage(chatId, message, { parse_mode: "HTML" });
              } catch (error) {
                const errMsg = `❌ <b>Error en Get User Followers:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
              }
              sendTelegramMenu(chatId);
            });
          });
      });
    });
}

// 6. Get User Followings
async function getUserFollowings_Telegram(chatId) {
  bot.sendMessage(chatId, "👣 <b>Get User Followings</b>\nIngrese el <b>usuario</b> (sin @):")
    .then(() => {
      bot.once('message', async (reply) => {
        const userName = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese el <b>cursor</b> (escribe '1' para la primera página):")
          .then(() => {
            bot.once('message', async (r2) => {
              const cursor = getOptionalValue(r2.text);
              try {
                const response = await axios.get(`${BASE_URL}/twitter/user/followings`, {
                  params: { userName, cursor },
                  headers: { 'X-API-Key': API_KEY }
                });
                const followings = response.data.followings;
                if (!followings || followings.length === 0) {
                  bot.sendMessage(chatId, "⚠️ No se encontraron cuentas seguidas.");
                  return sendTelegramMenu(chatId);
                }
                let message = `<b>👣 Cuentas seguidas por @${userName}:</b>\n\n`;
                followings.forEach(user => {
                  message += `• <b>Nombre:</b> ${user.name}\n`;
                  message += `• <b>Usuario:</b> @${user.userName}\n`;
                  message += `• <b>ID:</b> ${user.id}\n\n`;
                });
                bot.sendMessage(chatId, message, { parse_mode: "HTML" });
              } catch (error) {
                const errMsg = `❌ <b>Error en Get User Followings:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
              }
              sendTelegramMenu(chatId);
            });
          });
      });
    });
}

// 7. Get User Mentions
async function getUserMentions_Telegram(chatId) {
  bot.sendMessage(chatId, "💬 <b>Get User Mentions</b>\nIngrese el <b>usuario</b> (sin @):")
    .then(() => {
      bot.once('message', async (reply) => {
        const userName = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese el <b>cursor</b> (escribe '1' para la primera página):")
          .then(() => {
            bot.once('message', async (r2) => {
              const cursor = getOptionalValue(r2.text);
              try {
                const response = await axios.get(`${BASE_URL}/twitter/user/mentions`, {
                  params: { userName, cursor },
                  headers: { 'X-API-Key': API_KEY }
                });
                const mentions = response.data.tweets;
                if (!mentions || mentions.length === 0) {
                  bot.sendMessage(chatId, "⚠️ No se encontraron menciones.");
                  return sendTelegramMenu(chatId);
                }
                let message = `<b>💬 Menciones a @${userName}:</b>\n\n`;
                mentions.forEach(tweet => {
                  message += `• <b>Tweet ID:</b> ${tweet.id}\n`;
                  message += `• <b>Texto:</b> ${tweet.text}\n`;
                  message += `• <b>Fecha:</b> ${tweet.createdAt}\n\n`;
                });
                bot.sendMessage(chatId, message, { parse_mode: "HTML" });
              } catch (error) {
                const errMsg = `❌ <b>Error en Get User Mentions:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
              }
              sendTelegramMenu(chatId);
            });
          });
      });
    });
}

// 8. Get Tweet Replies
async function getTweetReplies_Telegram(chatId) {
  bot.sendMessage(chatId, "💭 <b>Get Tweet Replies</b>\nIngrese el <b>tweetId</b>:")
    .then(() => {
      bot.once('message', async (reply) => {
        const tweetId = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese el <b>cursor</b> (escribe '1' para la primera página):")
          .then(() => {
            bot.once('message', async (r2) => {
              const cursor = getOptionalValue(r2.text);
              try {
                const response = await axios.get(`${BASE_URL}/twitter/tweet/replies`, {
                  params: { tweetId, cursor },
                  headers: { 'X-API-Key': API_KEY }
                });
                const replies = response.data.replies;
                if (!replies || replies.length === 0) {
                  bot.sendMessage(chatId, "⚠️ No se encontraron respuestas para este tweet.");
                  return sendTelegramMenu(chatId);
                }
                let message = `<b>💭 Respuestas al tweet ${tweetId}:</b>\n\n`;
                replies.forEach(replyObj => {
                  message += `• <b>Reply ID:</b> ${replyObj.id}\n`;
                  message += `• <b>Texto:</b> ${replyObj.text}\n`;
                  message += `• <b>Fecha:</b> ${replyObj.createdAt}\n\n`;
                });
                bot.sendMessage(chatId, message, { parse_mode: "HTML" });
              } catch (error) {
                const errMsg = `❌ <b>Error en Get Tweet Replies:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
              }
              sendTelegramMenu(chatId);
            });
          });
      });
    });
}

// 9. Get Tweet Quotations
async function getTweetQuotations_Telegram(chatId) {
  bot.sendMessage(chatId, "❝ <b>Get Tweet Quotations</b>\nIngrese el <b>tweetId</b>:")
    .then(() => {
      bot.once('message', async (reply) => {
        const tweetId = reply.text.trim();
        bot.sendMessage(chatId, "¿<b>Incluir replies</b>? Escribe <b>true</b> o <b>false</b> (por defecto: true):")
          .then(() => {
            bot.once('message', async (r2) => {
              const includeRepliesInput = r2.text.trim().toLowerCase();
              const includeReplies = includeRepliesInput === "false" ? false : true;
              bot.sendMessage(chatId, "Ingrese el <b>cursor</b> (escribe '1' para la primera página):")
                .then(() => {
                  bot.once('message', async (r3) => {
                    const cursor = getOptionalValue(r3.text);
                    try {
                      const response = await axios.get(`${BASE_URL}/twitter/tweet/quotes`, {
                        params: { tweetId, includeReplies, cursor },
                        headers: { 'X-API-Key': API_KEY }
                      });
                      const quotes = response.data.tweets;
                      if (!quotes || quotes.length === 0) {
                        bot.sendMessage(chatId, "⚠️ No se encontraron citas para este tweet.");
                        return sendTelegramMenu(chatId);
                      }
                      let message = `<b>❝ Citas del tweet ${tweetId}:</b>\n\n`;
                      quotes.forEach(quote => {
                        message += `• <b>Quote ID:</b> ${quote.id}\n`;
                        message += `• <b>Texto:</b> ${quote.text}\n`;
                        message += `• <b>Fecha:</b> ${quote.createdAt}\n\n`;
                      });
                      bot.sendMessage(chatId, message, { parse_mode: "HTML" });
                    } catch (error) {
                      const errMsg = `❌ <b>Error en Get Tweet Quotations:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                      bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
                    }
                    sendTelegramMenu(chatId);
                  });
                });
            });
          });
      });
    });
}

// 10. Get Tweet Retweeters
async function getTweetRetweeters_Telegram(chatId) {
  bot.sendMessage(chatId, "🔄 <b>Get Tweet Retweeters</b>\nIngrese el <b>tweetId</b>:")
    .then(() => {
      bot.once('message', async (reply) => {
        const tweetId = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese el <b>cursor</b> (escribe '1' para la primera página):")
          .then(() => {
            bot.once('message', async (r2) => {
              const cursor = getOptionalValue(r2.text);
              try {
                const response = await axios.get(`${BASE_URL}/twitter/tweet/retweeters`, {
                  params: { tweetId, cursor },
                  headers: { 'X-API-Key': API_KEY }
                });
                const users = response.data.users;
                if (!users || users.length === 0) {
                  bot.sendMessage(chatId, "⚠️ No se encontraron retweeters para este tweet.");
                  return sendTelegramMenu(chatId);
                }
                let message = `<b>🔄 Retweeters del tweet ${tweetId}:</b>\n\n`;
                users.forEach(user => {
                  message += `• <b>Nombre:</b> ${user.name}\n`;
                  message += `• <b>Usuario:</b> @${user.userName}\n`;
                  message += `• <b>ID:</b> ${user.id}\n\n`;
                });
                bot.sendMessage(chatId, message, { parse_mode: "HTML" });
              } catch (error) {
                const errMsg = `❌ <b>Error en Get Tweet Retweeters:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
              }
              sendTelegramMenu(chatId);
            });
          });
      });
    });
}

// 11. Get List Tweets
async function getListTweets_Telegram(chatId) {
  bot.sendMessage(chatId, "📋 <b>Get List Tweets</b>\nIngrese el <b>listId</b>:")
    .then(() => {
      bot.once('message', async (reply) => {
        const listId = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese <b>sinceTime</b> (timestamp unix, opcional - escribe '1' para omitir):")
          .then(() => {
            bot.once('message', async (r2) => {
              const sinceTime = getOptionalValue(r2.text);
              bot.sendMessage(chatId, "Ingrese <b>untilTime</b> (timestamp unix, opcional - escribe '1' para omitir):")
                .then(() => {
                  bot.once('message', async (r3) => {
                    const untilTime = getOptionalValue(r3.text);
                    bot.sendMessage(chatId, "¿<b>Incluir replies</b>? Escribe <b>true</b> o <b>false</b> (por defecto: true):")
                      .then(() => {
                        bot.once('message', async (r4) => {
                          const includeRepliesInput = r4.text.trim().toLowerCase();
                          const includeReplies = includeRepliesInput === "false" ? false : true;
                          bot.sendMessage(chatId, "Ingrese el <b>cursor</b> (escribe '1' para la primera página):")
                            .then(() => {
                              bot.once('message', async (r5) => {
                                const cursor = getOptionalValue(r5.text);
                                try {
                                  const params = { listId, includeReplies, cursor };
                                  if (sinceTime) params.sinceTime = sinceTime;
                                  if (untilTime) params.untilTime = untilTime;
                                  const response = await axios.get(`${BASE_URL}/twitter/list/tweets`, {
                                    params,
                                    headers: { 'X-API-Key': API_KEY }
                                  });
                                  const tweets = response.data.tweets;
                                  if (!tweets || tweets.length === 0) {
                                    bot.sendMessage(chatId, "⚠️ No se encontraron tweets en la lista.");
                                    return sendTelegramMenu(chatId);
                                  }
                                  let message = `<b>📋 Tweets de la lista ${listId}:</b>\n\n`;
                                  tweets.forEach(tweet => {
                                    message += `• <b>Tweet ID:</b> ${tweet.id}\n`;
                                    message += `• <b>Texto:</b> ${tweet.text}\n`;
                                    message += `• <b>Fecha:</b> ${tweet.createdAt}\n\n`;
                                  });
                                  bot.sendMessage(chatId, message, { parse_mode: "HTML" });
                                } catch (error) {
                                  const errMsg = `❌ <b>Error en Get List Tweets:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                                  bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
                                }
                                sendTelegramMenu(chatId);
                              });
                            });
                        });
                      });
                  });
                });
            });
          });
      });
    });
}

// 12. Monitor Tweet con Filtros
async function monitorTweetFilters_Telegram(chatId) {
  bot.sendMessage(chatId, "📡 <b>Monitor Tweet con Filtros</b>\nIngrese el <b>tweetId</b> del tweet publicado:")
    .then(() => {
      bot.once('message', async (reply) => {
        const tweetId = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese el <b>mínimo de seguidores</b> requerido:")
          .then(() => {
            bot.once('message', async (rMin) => {
              const minFollowers = Number(rMin.text.trim());
              if (isNaN(minFollowers)) {
                bot.sendMessage(chatId, "⚠️ El valor mínimo debe ser numérico.");
                return sendTelegramMenu(chatId);
              }
              bot.sendMessage(chatId, "Ingrese el <b>máximo de seguidores</b> permitido:")
                .then(() => {
                  bot.once('message', async (rMax) => {
                    const maxFollowers = Number(rMax.text.trim());
                    if (isNaN(maxFollowers)) {
                      bot.sendMessage(chatId, "⚠️ El valor máximo debe ser numérico.");
                      return sendTelegramMenu(chatId);
                    }
                    try {
                      const tweetResponse = await axios.get(`${BASE_URL}/twitter/tweet/info`, {
                        params: { tweetId },
                        headers: { 'X-API-Key': API_KEY }
                      });
                      const tweetData = tweetResponse.data.data;
                      if (!tweetData) {
                        bot.sendMessage(chatId, "⚠️ No se encontró información para ese tweet.");
                        return sendTelegramMenu(chatId);
                      }
                      const authorFollowers = tweetData.author.followers;
                      if (authorFollowers < minFollowers || authorFollowers > maxFollowers) {
                        bot.sendMessage(chatId, `⚠️ El autor (@${tweetData.author.userName}) tiene ${authorFollowers} seguidores, lo cual no cumple el filtro (${minFollowers}-${maxFollowers}).`);
                        return sendTelegramMenu(chatId);
                      }
                      const repliesResponse = await axios.get(`${BASE_URL}/twitter/tweet/replies`, {
                        params: { tweetId, cursor: "" },
                        headers: { 'X-API-Key': API_KEY }
                      });
                      const allReplies = repliesResponse.data.replies || [];
                      const filteredReplies = allReplies.filter(r => r.author && r.author.followers >= minFollowers && r.author.followers <= maxFollowers);
                      const retweetersResponse = await axios.get(`${BASE_URL}/twitter/tweet/retweeters`, {
                        params: { tweetId, cursor: "" },
                        headers: { 'X-API-Key': API_KEY }
                      });
                      const allRetweeters = retweetersResponse.data.users || [];
                      const filteredRetweeters = allRetweeters.filter(u => u.followers >= minFollowers && u.followers <= maxFollowers);
                      let message = `<b>📡 Monitor Tweet con Filtros</b>\n\n`;
                      message += `<b>Tweet:</b>\n`;
                      message += `• <b>ID:</b> ${tweetData.id}\n`;
                      message += `• <b>Texto:</b> ${tweetData.text}\n`;
                      message += `• <b>Autor:</b> @${tweetData.author.userName} (${tweetData.author.followers} seguidores)\n\n`;
                      message += `<b>Respuestas que cumplen:</b> (${filteredReplies.length}):\n`;
                      if (filteredReplies.length === 0) {
                        message += "• Ninguna respuesta cumple el filtro.\n\n";
                      } else {
                        filteredReplies.forEach((r, i) => {
                          message += `• <b>Reply ${i + 1}:</b> ${r.text} (por @${r.author.userName} - ${r.author.followers} seguidores)\n`;
                        });
                        message += "\n";
                      }
                      message += `<b>Retweeters que cumplen:</b> (${filteredRetweeters.length}):\n`;
                      if (filteredRetweeters.length === 0) {
                        message += "• Ningún retweeter cumple el filtro.\n";
                      } else {
                        filteredRetweeters.forEach((u, i) => {
                          message += `• <b>Usuario ${i + 1}:</b> @${u.userName} (${u.followers} seguidores)\n`;
                        });
                      }
                      bot.sendMessage(chatId, message, { parse_mode: "HTML" });
                    } catch (error) {
                      const errMsg = `❌ <b>Error en Monitor Tweet con Filtros:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                      bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
                    }
                    sendTelegramMenu(chatId);
                  });
                });
            });
          });
      });
    });
}

// 13. Nueva Opción: Filtrar Tweets en Tiempo Real
async function filterRealtimeTweets_Telegram(chatId) {
  bot.sendMessage(chatId, "🔔 <b>Filtrar en Tiempo Real</b>\nIngrese el <b>usuario</b> de Twitter al cual desea hacer seguimiento (sin @):", { parse_mode: "HTML" })
    .then(() => {
      bot.once('message', async (reply) => {
        const trackedUser = reply.text.trim();
        bot.sendMessage(chatId, "Ingrese el filtro deseado:\n• Para <b>palabras clave</b> ingrese el término\n• Para <b>hashtags</b> ingrese el hashtag (incluya #)\n• Para <b>menciones</b> ingrese el @usuario\n• Si no desea aplicar filtro, escriba <b>0</b>:", { parse_mode: "HTML" })
          .then(() => {
            bot.once('message', async (rFilter) => {
              const filterInput = rFilter.text.trim();
              let query = "";
              if (filterInput === "0") {
                query = `from:@${trackedUser}`;
              } else {
                query = `from:@${trackedUser} ${filterInput}`;
              }
              try {
                const response = await axios.get(`${BASE_URL}/twitter/tweet/advanced_search`, {
                  params: { query, queryType: 'Latest' },
                  headers: { 'X-API-Key': API_KEY }
                });
                const tweets = response.data.tweets;
                if (!tweets || tweets.length === 0) {
                  bot.sendMessage(chatId, "⚠️ No se encontraron tweets para este filtro en tiempo real.", { parse_mode: "HTML" });
                  return sendTelegramMenu(chatId);
                }
                let message = `<b>🔔 Resultados para: ${query}</b>\n\n`;
                tweets.slice(0, 10).forEach((tweet, index) => {
                  message += `<b>Tweet ${index + 1}:</b>\n`;
                  message += `• <b>ID:</b> ${tweet.id}\n`;
                  message += `• <b>Texto:</b> ${tweet.text}\n`;
                  message += `• <b>URL:</b> <a href="${tweet.url}">Ver</a>\n`;
                  message += `• <b>Creado:</b> ${tweet.createdAt}\n\n`;
                });
                bot.sendMessage(chatId, message, { parse_mode: "HTML" });
              } catch (error) {
                const errMsg = `❌ <b>Error en Filtrar en Tiempo Real:</b> ${error.response ? JSON.stringify(error.response.data) : error.message}`;
                bot.sendMessage(chatId, errMsg, { parse_mode: "HTML" });
              }
              sendTelegramMenu(chatId);
            });
          });
      });
    });
}

// =============================================================================
// Manejo de comandos y callbacks de Telegram
// =============================================================================

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "👋 ¡Bienvenido al <b>Bot de Twitter API</b>!\nUsa el menú para gestionar las operaciones.", { parse_mode: "HTML" });
  sendTelegramMenu(chatId);
});

bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  if (data === "exit") {
    bot.sendMessage(chatId, "🚪 <b>¡Hasta luego!</b>\nEl bot se ha desconectado.", { parse_mode: "HTML" });
    return;
  }
  switch (data) {
    case "advancedSearch":
      advancedSearch_Telegram(chatId);
      break;
    case "batchGetUserInfo":
      batchGetUserInfo_Telegram(chatId);
      break;
    case "getUserInfo":
      getUserInfo_Telegram(chatId);
      break;
    case "getUserLastTweets":
      getUserLastTweets_Telegram(chatId);
      break;
    case "getUserFollowers":
      getUserFollowers_Telegram(chatId);
      break;
    case "getUserFollowings":
      getUserFollowings_Telegram(chatId);
      break;
    case "getUserMentions":
      getUserMentions_Telegram(chatId);
      break;
    case "getTweetReplies":
      getTweetReplies_Telegram(chatId);
      break;
    case "getTweetQuotations":
      getTweetQuotations_Telegram(chatId);
      break;
    case "getTweetRetweeters":
      getTweetRetweeters_Telegram(chatId);
      break;
    case "getListTweets":
      getListTweets_Telegram(chatId);
      break;
    case "monitorTweetFilters":
      monitorTweetFilters_Telegram(chatId);
      break;
    case "filterRealtimeTweets":
      filterRealtimeTweets_Telegram(chatId);
      break;
    default:
      bot.sendMessage(chatId, "⚠️ Opción no válida.");
      sendTelegramMenu(chatId);
  }
});
