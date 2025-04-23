// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\webhookService.js
const axios  = require('axios');
const { API_KEY, BASE_URL } = require('../config');

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'X-API-Key': API_KEY }
});

// Crea regla (devuelve rule_id)
async function addRule(username) {
  const res = await client.post('/oapi/tweet_filter/add_rule', {
    tag: `rule_${username}`,
    value: `from:${username}`,
    interval_seconds: 100
  });
  return res.data.rule_id;
}

// Activa/desactiva regla
async function updateRule(ruleId, username, active) {
  const res = await client.post('/oapi/tweet_filter/update_rule', {
    rule_id:        ruleId,
    tag:            `rule_${username}`,
    value:          `from:${username}`,
    interval_seconds:100,
    is_effect:      active ? 1 : 0
  });
  return res.data.status === 'success';
}

module.exports = { addRule, updateRule };
