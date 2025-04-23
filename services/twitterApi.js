// File: D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\twitterApi.js
const axios = require('axios');
const { API_KEY, BASE_URL } = require('../config');
const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-API-Key': API_KEY },
  timeout: 5000
});

/**
 * Obtiene información detallada de un usuario.
 * @param {string} username 
 */
async function getUser(username) {
  const res = await client.get('/twitter/user/info', {
    params: { userName: username }
  });
  return res.data.data;
}

/**
 * Obtiene hasta `count` últimos tweets de un usuario (excluye replies).
 * @param {string} username 
 * @param {number} count 
 */
async function getUserLastTweets(username, count = 5) {
  const res = await client.get('/twitter/user/last_tweets', {
    params: { userName: username, cursor: '' }
  });
  const tweets = res.data.tweets || [];
  return tweets.slice(0, count);
}

/**
 * Obtiene hasta `count` menciones a un usuario.
 * @param {string} username 
 * @param {number} count 
 */
async function getMentions(username, count = 5) {
  const res = await client.get('/twitter/user/mentions', {
    params: { userName: username, cursor: '' }
  });
  const tweets = res.data.tweets || [];
  return tweets.slice(0, count);
}

/**
 * Obtiene hasta `count` replies del usuario (usa búsqueda avanzada).
 * @param {string} username 
 * @param {number} count 
 */
async function getUserReplies(username, count = 5) {
  const query = `from:${username} filter:replies`;
  const res = await client.get('/twitter/tweet/advanced_search', {
    params: { query, queryType: 'Latest', cursor: '' }
  });
  const tweets = res.data.tweets || [];
  return tweets.slice(0, count);
}

/**
 * Obtiene hasta `count` retweets del usuario (usa búsqueda avanzada).
 * @param {string} username 
 * @param {number} count 
 */
async function getUserRetweets(username, count = 5) {
  const query = `from:${username} filter:retweets`;
  const res = await client.get('/twitter/tweet/advanced_search', {
    params: { query, queryType: 'Latest', cursor: '' }
  });
  const tweets = res.data.tweets || [];
  return tweets.slice(0, count);
}

module.exports = {
  getUser,
  getUserLastTweets,
  getMentions,
  getUserReplies,
  getUserRetweets
};
