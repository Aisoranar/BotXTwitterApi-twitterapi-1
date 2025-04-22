// D:\Documents\GitHub\BotXTwitterApi-twitterapi\services\planService.js
const { PLANS } = require('../config');
const db        = require('../db/database');

// Sólo usado por admin:
async function upgradePlan(userId, newPlan) {
  const user = await db.getUser(userId);
  if (!PLANS[newPlan]) throw new Error('Plan inválido');
  user.plan = newPlan;
  await db.saveDB();
  return user.plan;
}

module.exports = { upgradePlan };
