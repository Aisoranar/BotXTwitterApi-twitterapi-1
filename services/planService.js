// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\planService.js
const { PLANS } = require('../config');
const db        = require('../db/database');

async function upgradePlan(userId, newPlan) {
  const u = await db.getUser(userId);
  if (!PLANS[newPlan]) throw new Error('Plan inválido');
  u.plan = newPlan;
  await db.saveDB();
  return u.plan;
}

module.exports = { upgradePlan };
