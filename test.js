// =========================================================================
// SCRIPT DE PRUEBA RÁPIDA - Twitter Monitor Bot
// =========================================================================

const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// Tus datos actuales
const API_KEY = 'ad51503f2c64404687aa1452839681cd';
const BASE_URL = 'https://api.twitterapi.io';
const BOT_TOKEN = "7325587317:AAEi3O2F2CckkIeOnmJkqXxcxRTxfNikqOQ";
const CHAT_ID = "-1002513153868";

// =========================================================================
// FUNCIONES DE PRUEBA
// =========================================================================

async function testTwitterAPI() {
  console.log('🧪 Probando Twitter API...');
  
  try {
    const response = await axios.get(`${BASE_URL}/twitter/user/info`, {
      params: { userName: 'elonmusk' },
      headers: { 'X-API-Key': API_KEY },
      timeout: 10000
    });
    
    if (response.data && response.data.data) {
      const user = response.data.data;
      console.log('✅ Twitter API funciona correctamente');
      console.log(`   Usuario: @${user.userName}`);
      console.log(`   Nombre: ${user.name}`);
      console.log(`   Seguidores: ${user.followers?.toLocaleString()}`);
      return true;
    } else {
      console.log('❌ Respuesta inesperada de Twitter API');
      return false;
    }
  } catch (error) {
    console.log('❌ Error con Twitter API:', error.message);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Data:`, error.response.data);
    }
    return false;
  }
}

async function testTelegramBot() {
  console.log('🧪 Probando Telegram Bot...');
  
  try {
    const bot = new TelegramBot(BOT_TOKEN);
    const me = await bot.getMe();
    
    console.log('✅ Bot de Telegram funciona correctamente');
    console.log(`   Bot: @${me.username}`);
    console.log(`   ID: ${me.id}`);
    console.log(`   Nombre: ${me.first_name}`);
    
    // Enviar mensaje de prueba
    const testMessage = `🧪 <b>Prueba de Conexión</b>\n\n` +
      `✅ El bot está funcionando correctamente\n` +
      `⏰ ${new Date().toLocaleString('es-ES')}\n\n` +
      `🚀 ¡Listo para monitorear Twitter!`;
    
    await bot.sendMessage(CHAT_ID, testMessage, { parse_mode: 'HTML' });
    console.log('✅ Mensaje de prueba enviado al chat');
    
    return true;
  } catch (error) {
    console.log('❌ Error con Telegram Bot:', error.message);
    return false;
  }
}

async function testTwitterSearch() {
  console.log('🧪 Probando búsqueda de tweets...');
  
  try {
    const response = await axios.get(`${BASE_URL}/twitter/user/last_tweets`, {
      params: { userName: 'elonmusk' },
      headers: { 'X-API-Key': API_KEY }
    });
    
    const tweets = response.data.tweets;
    if (tweets && tweets.length > 0) {
      console.log('✅ Búsqueda de tweets funciona');
      console.log(`   Tweets encontrados: ${tweets.length}`);
      console.log(`   Último tweet: ${tweets[0].text.substring(0, 50)}...`);
      return true;
    } else {
      console.log('❌ No se encontraron tweets');
      return false;
    }
  } catch (error) {
    console.log('❌ Error buscando tweets:', error.message);
    return false;
  }
}

async function simulateMonitoring() {
  console.log('🧪 Simulando monitoreo en tiempo real...');
  
  const bot = new TelegramBot(BOT_TOKEN);
  
  try {
    // Simular detección de tweet
    const fakeTweet = {
      id: Date.now().toString(),
      text: '🧪 Este es un tweet de prueba para verificar el monitor en tiempo real',
      createdAt: new Date().toISOString(),
      likeCount: 42,
      retweetCount: 13,
      replyCount: 7
    };
    
    const message = `📝 <b>@elonmusk</b> publicó:\n\n` +
      `💬 ${fakeTweet.text}\n\n` +
      `📅 ${new Date(fakeTweet.createdAt).toLocaleString('es-ES')}\n` +
      `❤️ ${fakeTweet.likeCount} | 🔄 ${fakeTweet.retweetCount} | 💬 ${fakeTweet.replyCount}\n\n` +
      `⚡ <i>Simulación de monitoreo en tiempo real</i>`;
    
    await bot.sendMessage(CHAT_ID, message, { parse_mode: 'HTML' });
    console.log('✅ Simulación de tweet enviada');
    
    return true;
  } catch (error) {
    console.log('❌ Error en simulación:', error.message);
    return false;
  }
}

// =========================================================================
// EJECUTAR TODAS LAS PRUEBAS
// =========================================================================

async function runAllTests() {
  console.log('🚀 INICIANDO PRUEBAS DEL TWITTER MONITOR BOT\n');
  console.log('='.repeat(60));
  
  const results = {
    twitterAPI: false,
    telegramBot: false,
    twitterSearch: false,
    monitoring: false
  };
  
  // Prueba 1: Twitter API
  console.log('\n📍 PRUEBA 1: Twitter API');
  results.twitterAPI = await testTwitterAPI();
  
  // Prueba 2: Telegram Bot
  console.log('\n📍 PRUEBA 2: Telegram Bot');
  results.telegramBot = await testTelegramBot();
  
  // Prueba 3: Búsqueda de Tweets
  console.log('\n📍 PRUEBA 3: Búsqueda de Tweets');
  results.twitterSearch = await testTwitterSearch();
  
  // Prueba 4: Simulación de Monitoreo
  console.log('\n📍 PRUEBA 4: Simulación de Monitoreo');
  results.monitoring = await simulateMonitoring();
  
  // Resumen final
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMEN DE PRUEBAS:');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASÓ' : 'FALLÓ';
    console.log(`${icon} ${test.padEnd(20)} ${status}`);
  });
  
  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log('\n📊 RESULTADO FINAL:');
  if (totalPassed === totalTests) {
    console.log('🎉 ¡TODAS LAS PRUEBAS PASARON!');
    console.log('✅ Tu bot está listo para funcionar');
    console.log('\n🚀 PRÓXIMOS PASOS:');
    console.log('1. Ejecuta: node app.js');
    console.log('2. Envía /start a tu bot');
    console.log('3. Añade cuentas con /add usuario');
    console.log('4. Inicia el monitor con ▶️');
    console.log('5. ¡Recibe notificaciones automáticas!');
  } else {
    console.log(`⚠️ ${totalPassed}/${totalTests} pruebas pasaron`);
    console.log('❌ Hay problemas que necesitan atención');
    
    if (!results.twitterAPI) {
      console.log('\n🔧 TWITTER API:');
      console.log('   • Verifica tu API Key');
      console.log('   • Verifica tu conexión a internet');
    }
    
    if (!results.telegramBot) {
      console.log('\n🔧 TELEGRAM BOT:');
      console.log('   • Verifica tu Bot Token');
      console.log('   • Verifica tu Chat ID');
    }
    
    if (!results.twitterSearch) {
      console.log('\n🔧 BÚSQUEDA TWITTER:');
      console.log('   • Puede ser límite de API');
      console.log('   • Intenta más tarde');
    }
  }
  
  console.log('\n💡 TIP: Revisa los logs para más detalles');
  console.log('📧 Chat ID configurado:', CHAT_ID);
  
  process.exit(0);
}

// =========================================================================
// EJECUTAR
// =========================================================================

if (require.main === module) {
  runAllTests().catch(error => {
    console.error('💥 Error fatal en las pruebas:', error);
    process.exit(1);
  });
}

module.exports = {
  testTwitterAPI,
  testTelegramBot,
  testTwitterSearch,
  simulateMonitoring
};