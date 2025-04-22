// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\twitterApi.js
const axios = require('axios');
const { API_KEY, BASE_URL } = require('../config');

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-API-Key': API_KEY },
  timeout: 5000
});

async function getUser(username) {
  const res = await client.get('/twitter/user/info', {
    params: { userName: username }
  });
  return res.data.data;
}

async function getLastTweet(username) {
  const res = await client.get('/twitter/user/last_tweets', {
    params: { userName: username }
  });
  return res.data.tweets?.[0] || null;
}

async function getMentions(username) {
  const res = await client.get('/twitter/user/mentions', {
    params: { userName: username }
  });
  return res.data.tweets || [];
}

async function getTweetReplies(tweetId) {
  const res = await client.get('/twitter/tweet/replies', {
    params: { tweetId }
  });
  return res.data.replies || [];
}

async function getTweetRetweeters(tweetId) {
  const res = await client.get('/twitter/tweet/retweeters', {
    params: { tweetId }
  });
  return res.data.retweeters || [];
}

module.exports = {
  getUser,
  getLastTweet,
  getMentions,
  getTweetReplies,
  getTweetRetweeters
};
