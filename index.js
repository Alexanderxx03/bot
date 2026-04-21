require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, doc, setDoc, getDoc, query, where, serverTimestamp } = require('firebase/firestore');
const express = require('express');
const axios = require('axios');

// --- CONFIGURACIÓN DEL SERVIDOR WEB (Para Render/Pings) ---
const appExpress = express();
const PORT = process.env.PORT || 3000;

appExpress.get('/', (req, res) => {
  res.send('🤖 Bot VIP Alex is running...');
});

appExpress.listen(PORT, () => {
  console.log(`📡 Servidor de salud escuchando en puerto ${PORT}`);
});

// --- CONFIGURACIÓN FIREBASE (Segura mediante Env Vars) ---
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CONFIGURACIÓN DEL BOT ---
const bot = new Telegraf(process.env.BOT_TOKEN);
const ADMIN_ID = 1294083819; // Tu ID verificado
const ADMIN_HANDLE = 'Iluminatt777'; 

// --- INFORMACIÓN DEL CURSO ---
const CURSO_ELITE = {
  title: '⭐CURSO ELITE MASTER VIP⭐',
  priceUSD: '18 USD',
  priceMXN: '311 MXN',
  includes: [
    '✔️CHEK GRATIS',
    '✔️BINS PRIVADOS',
    '✔️CUENTAS HITS',
    '✔️VPN',
    '✔️AYUDA DE ADMINS',
    '✔️METODOS',
    '✔️KEYS DE BOT CHEK VIP',
    '✔️CREDITOS DEL BOT CHEK'
  ],
  footer: 'QUE ESPERAS PARA SACAR TUS CUENTAS, COMPRAS Y PROBAR TODAS TUS CAPACIDADES 💎\n\n📌DISPONIBLE MOVIL Y PC'
};

const INFO_PAGOS = `💙 *𝗣𝗔𝗚𝗢𝗦* 💙
*𝐁𝐈𝐍𝐀𝐍𝐂𝐄:* (Consultar por interno)
*𝐁𝐀𝐍𝐂𝐎𝐒 𝐃𝐄 𝐌É𝐗𝐈𝐂𝐎:* (Consultar por interno)
*Owner:* Alex
*Telegram:* @${ADMIN_HANDLE}`;

// --- MIDDLEWARE: REGISTRO DE USUARIOS EN FIRESTORE ---
bot.use(async (ctx, next) => {
  if (ctx.from) {
    try {
      const userRef = doc(db, 'users_tg', ctx.from.id.toString());
      await setDoc(userRef, {
        id: ctx.from.id,
        username: ctx.from.username || 'Sin username',
        first_name: ctx.from.first_name || '',
        last_seen: serverTimestamp()
      }, { merge: true });
    } catch (e) {
      console.error('Error guardando usuario en Firebase:', e);
    }
  }
  return next();
});

// --- COMANDOS ---

bot.start((ctx) => {
  ctx.reply(
    `👋 ¡Hola! Bienvenido a *Bot VIP Alex*\n\nSoy tu asistente para el Curso Elite Master. ¿Qué deseas hacer hoy?`,
    {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('⭐ Ver Curso Elite VIP', 'VER_PLAN')],
        [Markup.button.callback('👥 Ver Vendedores (Zellers)', 'LISTAR_ZELLERS')],
        [Markup.button.callback('💙 Métodos de Pago', 'VER_PAGOS')]
      ])
    }
  );
});

bot.command('plan', (ctx) => mostrarPlan(ctx));
bot.command('zellers', (ctx) => listarZellers(ctx));

bot.command('addzeller', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) {
    return ctx.reply('❌ No tienes permisos para usar este comando.');
  }

  const args = ctx.message.text.split(' ').slice(1);
  if (args.length < 1) {
    return ctx.reply('🤔 Uso correcto: `/addzeller @Usuario`', { parse_mode: 'Markdown' });
  }

  const username = args[0].replace('@', '');

  try {
    const zellerRef = collection(db, 'zellers');
    await addDoc(zellerRef, {
      nombre: username, 
      username: username,
      addedAt: serverTimestamp()
    });
    ctx.reply(`✅ Vendedor @${username} agregado correctamente.`, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Error al agregar zeller:', e);
    ctx.reply('❌ Error al conectar con la base de datos.');
  }
});

// --- COMANDO /bin (EXCLUSIVO) ---
bot.command('bin', async (ctx) => {
  const userId = ctx.from.id.toString();
  const args = ctx.message.text.split(' ');
  
  if (args.length < 2) {
    return ctx.reply('⚠️ *Uso:* `/bin 454023`', { parse_mode: 'Markdown' });
  }

  const bin = args[1].substring(0, 6);
  
  // Verificación de Acceso (Admin o Premium en Firestore)
  try {
    const userDoc = await getDoc(doc(db, 'users_tg', userId));
    const userData = userDoc.data();
    
    if (ctx.from.id !== ADMIN_ID && (!userData || userData.role !== 'premium')) {
      return ctx.reply('🛑 *ACCESO DENEGADO*\n\nEsta herramienta es exclusiva para miembros del *Curso ELITE MASTER VIP*.', { parse_mode: 'Markdown' });
    }

    const msg = await ctx.reply('🔍 *Consultando base de datos global...*', { parse_mode: 'Markdown' });

    // Consulta a la API
    const response = await axios.get(`https://data.handyapi.com/bin/${bin}`);
    const data = response.data;

    if (data.Status !== 'SUCCESS') {
      return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '❌ *BIN NO ENCONTRADO* o inválido.', { parse_mode: 'Markdown' });
    }

    const countryFlag = data.Country.Code ? `https://flagcdn.com/24x18/${data.Country.Code.toLowerCase()}.png` : '🗺️';
    
    let result = `💎 *ELITE MASTER - BIN CHECKER* 💎\n`;
    result += `━━━━━━━━━━━━━━━\n`;
    result += `🔢 *BIN:* \`${bin}\`\n`;
    result += `💳 *MARCA:* ${data.Scheme || 'N/A'}\n`;
    result += `🛡️ *TIPO:* ${data.Type || 'N/A'}\n`;
    result += `🏆 *NIVEL:* ${data.CardTier || 'N/A'}\n`;
    result += `🏦 *BANCO:* ${data.Issuer || 'N/A'}\n`;
    result += `🗺️ *PAÍS:* ${data.Country.Name || 'N/A'} ${data.Country.Code || ''}\n`;
    result += `━━━━━━━━━━━━━━━\n`;
    result += `🖥️ *Powered by Alex VIP*`;

    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, result, { parse_mode: 'Markdown' });

  } catch (e) {
    console.error('Error en /bin:', e);
    ctx.reply('❌ Error interno al realizar la consulta.');
  }
});

// --- COMANDO PARA DAR PREMIUM (SOLO ADMIN) ---
bot.command('setpremium', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply('Uso: `/setpremium <ID_TELEGRAM>`', { parse_mode: 'Markdown' });

  const targetId = args[1];
  try {
    await setDoc(doc(db, 'users_tg', targetId), { role: 'premium' }, { merge: true });
    ctx.reply(`✅ Usuario \`${targetId}\` ahora tiene acceso *PREMIUM*.`, { parse_mode: 'Markdown' });
  } catch (e) {
    ctx.reply('Error al actualizar permisos.');
  }
});

// --- ACCIONES ---

bot.action('VER_PLAN', (ctx) => mostrarPlan(ctx, true));
bot.action('LISTAR_ZELLERS', (ctx) => listarZellers(ctx, true));
bot.action('VER_PAGOS', (ctx) => {
  ctx.editMessageText(INFO_PAGOS, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('◀️ Volver', 'VOLVER_INICIO')]
    ])
  });
});

bot.action('VOLVER_INICIO', (ctx) => {
  ctx.editMessageText(`👋 Bienvenido de nuevo a *Bot VIP Alex*\n\n¿Qué deseas hacer ahora?`, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('⭐ Ver Curso Elite VIP', 'VER_PLAN')],
      [Markup.button.callback('👥 Ver Vendedores (Zellers)', 'LISTAR_ZELLERS')],
      [Markup.button.callback('💙 Métodos de Pago', 'VER_PAGOS')]
    ])
  });
});

// --- FUNCIONES AUXILIARES ---

async function mostrarPlan(ctx, edit = false) {
  const mensaje = `${CURSO_ELITE.title}\n\n✅ *PRECIOS DEL CURSO PERMANENTE*\n\n💲 *${CURSO_ELITE.priceUSD}*\n💰 *${CURSO_ELITE.priceMXN}*\n\n🔗 *QUE INCLUYE* 🔗\n\n${CURSO_ELITE.includes.join('\n')}\n\n${CURSO_ELITE.footer}`;
  
  const extra = {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💳 Comprar / Pagar', 'VER_PAGOS')],
      [Markup.button.callback('◀️ Volver', 'VOLVER_INICIO')]
    ])
  };

  if (edit) {
    try {
      await ctx.editMessageText(mensaje, extra);
    } catch(e) { ctx.reply(mensaje, extra); }
  } else {
    ctx.reply(mensaje, extra);
  }
}

async function listarZellers(ctx, edit = false) {
  try {
    const querySnapshot = await getDocs(collection(db, 'zellers'));
    let lista = '👥 *NUESTROS VENDEDORES AUTORIZADOS* 👥\n\n';
    
    if (querySnapshot.empty) {
      lista += 'No hay vendedores registrados por el momento.';
    } else {
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        lista += `🔹 *${data.nombre}* - @${data.username}\n`;
      });
    }

    const extra = {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('◀️ Volver', 'VOLVER_INICIO')]
      ])
    };

    if (edit) {
        try {
            await ctx.editMessageText(lista, extra);
        } catch(e) { ctx.reply(lista, extra); }
    } else {
      ctx.reply(lista, extra);
    }
  } catch (e) {
    console.error('Error listando zellers:', e);
    ctx.reply('❌ Error al obtener la lista de vendedores.');
  }
}

// ARRANCAR BOT
bot.launch().then(() => {
  console.log('🚀 Bot VIP Alex iniciado correctamente (Safe Mode).');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
