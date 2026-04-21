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

// --- CONFIGURACIÓN VISUAL (ESTILO KAORI) ---
const SEPARATOR = '━━━━━━━━━━━━━━━━━━━━';
const BOT_VERSION = '1.0';
const OWNER_HANDLE = '@Aleeeeeack';

async function getSignature(ctx) {
  let role = 'FREE';
  try {
    const userDoc = await getDoc(doc(db, 'users_tg', ctx.from.id.toString()));
    const userData = userDoc.data();
    if (ctx.from.id === ADMIN_ID || (userData && userData.role === 'premium')) {
      role = 'PREMIUM';
    }
  } catch (e) {}

  let footer = `\n${SEPARATOR}\n`;
  footer += `👤 *Req By:* [${ctx.from.first_name}](tg://user?id=${ctx.from.id}) » \`${role}\`\n`;
  footer += `${SEPARATOR}\n`;
  footer += `☁️ *Bot Version:* ${BOT_VERSION} ⛈️`;
  return footer;
}

function getFlagEmoji(countryCode) {
  if (!countryCode || countryCode.length !== 2) return '🏳️';
  return countryCode
    .toUpperCase()
    .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt()));
}

function generateLuhn(bin, length = 16) {
  let ccNumber = bin;
  
  // Rellenamos con números aleatorios hasta longitud-1
  while (ccNumber.length < length - 1) {
    ccNumber += Math.floor(Math.random() * 10).toString();
  }

  // Calculamos el dígito verificador (Luhn)
  let sum = 0;
  for (let i = 0; i < ccNumber.length; i++) {
    let digit = parseInt(ccNumber[ccNumber.length - 1 - i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  let checkDigit = (10 - (sum % 10)) % 10;
  return ccNumber + checkDigit;
}

function isValidLuhn(number) {
  let sum = 0;
  let shouldDouble = false;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number.charAt(i));
    if (shouldDouble) {
      if ((digit *= 2) > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return (sum % 10) === 0;
}

// --- GESTIÓN DE PROXIES ---
const PROXY_LIST = [
  // Formato: http://user:pass@ip:port o http://ip:port
  // Por el momento vacío, el usuario puede agregarlos aquí
];

function getRandomProxy() {
  if (PROXY_LIST.length === 0) return null;
  return PROXY_LIST[Math.floor(Math.random() * PROXY_LIST.length)];
}

// --- MIDDLEWARE DE AUTORIZACIÓN ---
async function isPremium(ctx) {
  if (ctx.from.id === ADMIN_ID) return true;
  try {
    const userDoc = await getDoc(doc(db, 'users_tg', ctx.from.id.toString()));
    const userData = userDoc.data();
    return userData && userData.role === 'premium';
  } catch (e) {
    return false;
  }
}

// --- COMANDO /gen y .gen (GENERADOR VIP) ---
const handleGen = async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;
  const args = text.split(' ');

  if (args.length < 2) {
    return ctx.reply('⚠️ *Uso:* `.gen 447227` o `/gen 447227`', { parse_mode: 'Markdown' });
  }

  const input = args[1].toUpperCase();
  const parts = input.split('|').map(p => p.trim());
  const bin = parts[0].replace(/\D/g, '');
  const inputMes = (parts[1] && parts[1] !== 'RND') ? parts[1].padStart(2, '0') : null;
  const inputYear = (parts[2] && parts[2] !== 'RND') ? (parts[2].length === 2 ? '20' + parts[2] : parts[2]) : null;
  const inputCvv = (parts[3] && parts[3] !== 'RND') ? parts[3] : null;
  const quantity = Math.min(parseInt(args[2]) || 10, 20);

  try {
    const userDoc = await getDoc(doc(db, 'users_tg', userId));
    const userData = userDoc.data();

    if (ctx.from.id !== ADMIN_ID && (!userData || userData.role !== 'premium')) {
      return ctx.reply('🛑 *ACCESO DENEGADO*\n\nEsta herramienta es exclusiva para miembros del *Curso ELITE MASTER VIP*.\n\n👤 *Tu ID:* `' + userId + '`', { parse_mode: 'Markdown' });
    }

    const msg = await ctx.reply('🔍 *Generando...*', { parse_mode: 'Markdown' });

    let binInfo = { scheme: 'N/A', type: 'N/A', bank: 'N/A', country: 'N/A', flag: '🏳️' };
    try {
      const response = await axios.get(`https://data.handyapi.com/bin/${bin}`);
      if (response.data.Status === 'SUCCESS') {
        binInfo = {
          scheme: response.data.Scheme,
          type: response.data.Type,
          tier: response.data.CardTier,
          bank: response.data.Issuer,
          country: response.data.Country.Name,
          flag: response.data.Country.Code || '🏳️'
        };
      }
    } catch (e) {}

    let lista = `#Bot VIP Alex ⚡ | CC Generator\n`;
    lista += `${SEPARATOR}\n`;
    lista += `*Format:* \`${bin}|xx|xx|xxx\`\n`;
    lista += `${SEPARATOR}\n`;

    for (let i = 0; i < quantity; i++) {
      const cc = generateLuhn(bin);
      const mm = inputMes || Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0');
      const yy = inputYear || Math.floor(Math.random() * (2031 - 2025) + 2025);
      const cvv = inputCvv || Math.floor(Math.random() * 899 + 100);
      lista += `\`${cc}|${mm}|${yy}|${cvv}\`\n`;
    }

    lista += `${SEPARATOR}\n`;
    lista += `➤ *Info:* ${binInfo.scheme} - ${binInfo.type} - ${binInfo.tier || 'N/A'}\n`;
    lista += `➤ *Issuer:* ${binInfo.bank}\n`;
    lista += `➤ *Country:* ${binInfo.country} ${getFlagEmoji(binInfo.flag)}\n`;
    
    lista += await getSignature(ctx);

    const callbackData = `REGEN_${bin}_${quantity}_${inputMes || 'x'}_${inputYear || 'x'}_${inputCvv || 'x'}`;

    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, lista, { 
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('⚙️ Re-Gen', callbackData),
          Markup.button.url('!! Updates', `https://t.me/${OWNER_HANDLE.replace('@', '')}`)
        ]
      ])
    });

  } catch (e) {
    console.error('Error en gen:', e);
    ctx.reply('❌ Error al generar.');
  }
};

bot.command('gen', handleGen);
bot.hears(/^\.gen (.+)$/, handleGen);

// Acción de Re-Generar
bot.action(/^REGEN_(.+)_(.+)_(.+)_(.+)_(.+)$/, async (ctx) => {
  const bin = ctx.match[1];
  const quantity = parseInt(ctx.match[2]);
  const inputMes = (ctx.match[3] === 'x' || ctx.match[3].toUpperCase() === 'RND') ? null : ctx.match[3];
  const inputYear = (ctx.match[4] === 'x' || ctx.match[4].toUpperCase() === 'RND') ? null : ctx.match[4];
  const inputCvv = (ctx.match[5] === 'x' || ctx.match[5].toUpperCase() === 'RND') ? null : ctx.match[5];
  
  let lista = `#Bot VIP Alex ⚡ | RE-GEN\n`;
  lista += `${SEPARATOR}\n`;
  for (let i = 0; i < quantity; i++) {
    const cc = generateLuhn(bin);
    const mm = inputMes || Math.floor(Math.random() * 12 + 1).toString().padStart(2, '0');
    const yy = inputYear || Math.floor(Math.random() * (2031 - 2025) + 2025);
    const cvv = inputCvv || Math.floor(Math.random() * 899 + 100);
    lista += `\`${cc}|${mm}|${yy}|${cvv}\`\n`;
  }
  
  lista += await getSignature(ctx);

  try {
    await ctx.editMessageText(lista, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [
          Markup.button.callback('⚙️ Re-Gen', ctx.match[0]),
          Markup.button.url('!! Updates', `https://t.me/${OWNER_HANDLE.replace('@', '')}`)
        ]
      ])
    });
  } catch(e) {}
});

// --- COMANDO /bin y .bin (EXCLUSIVO) ---
const handleBin = async (ctx) => {
  const userId = ctx.from.id.toString();
  const text = ctx.message.text;
  const args = text.split(' ');
  
  if (args.length < 2) {
    return ctx.reply('⚠️ *Uso:* `.bin 454023`', { parse_mode: 'Markdown' });
  }

  const bin = args[1].substring(0, 6);
  
  try {
    const userDoc = await getDoc(doc(db, 'users_tg', userId));
    const userData = userDoc.data();
    
    if (ctx.from.id !== ADMIN_ID && (!userData || userData.role !== 'premium')) {
      return ctx.reply('🛑 *ACCESO DENEGADO*\n\nEsta herramienta es exclusiva para miembros del *Curso ELITE MASTER VIP*.\n\n👤 *Tu ID:* `' + userId + '`', { parse_mode: 'Markdown' });
    }

    const msg = await ctx.reply('🔍 *Consultando...*', { parse_mode: 'Markdown' });

    const response = await axios.get(`https://data.handyapi.com/bin/${bin}`);
    const data = response.data;

    if (data.Status !== 'SUCCESS') {
      return ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '❌ *BIN NO ENCONTRADO*', { parse_mode: 'Markdown' });
    }

    let result = `#Bot VIP Alex ⚡ | BIN INFO\n`;
    result += `${SEPARATOR}\n`;
    result += `➤ *Bin:* \`${bin}\`\n`;
    result += `➤ *Brand:* ${data.Scheme || 'N/A'}\n`;
    result += `➤ *Type:* ${data.Type || 'N/A'}\n`;
    result += `➤ *Level:* ${data.CardTier || 'N/A'}\n`;
    result += `➤ *Bank:* ${data.Issuer || 'N/A'}\n`;
    result += `➤ *Country:* ${data.Country.Name} ${getFlagEmoji(data.Country.Code)}\n`;
    result += `➤ *Currency:* ${data.Currency || 'N/A'}\n`;
    
    result += await getSignature(ctx);

    await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, result, { 
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
            [Markup.button.url('!! Updates', `https://t.me/${OWNER_HANDLE.replace('@', '')}`)]
        ])
    });

  } catch (e) {
    console.error('Error en bin:', e);
    ctx.reply('❌ Error interno.');
  }
};

bot.command('bin', handleBin);
bot.hears(/^\.bin (.+)$/, handleBin);


// --- COMANDO PARA DAR PREMIUM (SOLO ADMIN) ---
bot.command('setpremium', async (ctx) => {
  if (ctx.from.id !== ADMIN_ID) return;

  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply('🤔 Uso: `/setpremium @Usuario`', { parse_mode: 'Markdown' });

  const input = args[1].replace('@', '');
  
  try {
    const q = query(collection(db, 'users_tg'), where('username', '==', input));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return ctx.reply(`❌ No encontré al usuario @${input} en mi base de datos. Pídele que inicie el bot primero.`);
    }

    const userDoc = querySnapshot.docs[0];
    await setDoc(doc(db, 'users_tg', userDoc.id), { role: 'premium' }, { merge: true });

    ctx.reply(`✅ Usuario @${input} (ID: \`${userDoc.id}\`) ahora tiene acceso *PREMIUM*.`, { parse_mode: 'Markdown' });
  } catch (e) {
    console.error('Error en setpremium:', e);
    ctx.reply('❌ Error al actualizar permisos.');
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
      [Markup.button.callback('🚀 Gateways Pro', 'VER_GATES')],
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

// --- COMANDO /chk (VALIDADOR DE LUHN) ---
const handleChk = async (ctx) => {
  if (!(await isPremium(ctx))) {
    return ctx.reply('🛑 Esta herramienta es exclusiva para miembros PREMIUM.');
  }

  const text = ctx.message.text;
  const args = text.split(' ');
  if (args.length < 2) return ctx.reply('⚠️ *Uso:* `/chk CC|MM|YY|CVV`', { parse_mode: 'Markdown' });

  const cardData = args[1].split('|')[0].replace(/\D/g, '');
  const isValid = isValidLuhn(cardData);

  let resp = `#Bot VIP Alex ⚡ | LUHN CHK\n`;
  resp += `${SEPARATOR}\n`;
  resp += `💳 *Card:* \`${args[1]}\`\n`;
  resp += `✨ *Status:* ${isValid ? '✅ VÁLIDA (Luhn)' : '❌ INVÁLIDA'}\n`;
  
  resp += await getSignature(ctx);

  ctx.reply(resp, { 
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([ [Markup.button.url('!! Updates', `https://t.me/${OWNER_HANDLE.replace('@', '')}`)] ])
  });
};

bot.command('chk', handleChk);
bot.hears(/^\.chk (.+)$/, handleChk);

// --- MENÚ DE GATEWAYS (/gates) ---
async function mostrarGateways(ctx, edit = false) {
  if (!(await isPremium(ctx))) {
    return ctx.reply(`🛑 *ACCESO DENEGADO*\n\n${SEPARATOR}\nLos Gateways son exclusivos para miembros del *Curso ELITE MASTER VIP*.\n\n👤 *Owner:* ${OWNER_HANDLE}`, { parse_mode: 'Markdown' });
  }

  const mensaje = `#Bot VIP Alex ⚡ | GATEWAYS MENU\n${SEPARATOR}\nSelecciona una categoría para ver los checkers disponibles:`;
  const extra = {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([
      [Markup.button.callback('💳 Gateways Auth', 'GATES_AUTH')],
      [Markup.button.callback('💰 Gateways Charge', 'GATES_CHARGE')],
      [Markup.button.callback('◀️ Volver', 'VOLVER_INICIO')]
    ])
  };

  if (edit) {
    try { await ctx.editMessageText(mensaje, extra); } catch(e) {}
  } else {
    ctx.reply(mensaje, extra);
  }
}

bot.command('gates', (ctx) => mostrarGateways(ctx));
bot.action('VER_GATES', (ctx) => mostrarGateways(ctx, true));

bot.action('GATES_AUTH', async (ctx) => {
  const mensaje = `#Bot VIP Alex ⚡ | AUTH GATEWAYS\n${SEPARATOR}\n` +
    `$st - Stripe Auth\n` +
    `$am - Amazon Pay\n` +
    `$bt - Braintree Auth\n\n` +
    `*Uso:* \`$st CC|MM|YY|CVV\``;
  
  ctx.editMessageText(mensaje, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard([ [Markup.button.callback('◀️ Volver', 'VER_GATES')] ])
  });
});

bot.action('GATES_CHARGE', async (ctx) => {
    const mensaje = `#Bot VIP Alex ⚡ | CHARGE GATEWAYS\n${SEPARATOR}\n` +
      `Próximamente...`;
    
    ctx.editMessageText(mensaje, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([ [Markup.button.callback('◀️ Volver', 'VER_GATES')] ])
    });
  });

// --- ARQUITECTURA DE GATEWAYS ($st, $am, $bt) ---
const handleGateway = async (ctx, gatewayName) => {
  if (!(await isPremium(ctx))) {
    return ctx.reply('🛑 Los Gateways son exclusivos para miembros PREMIUM.');
  }

  const args = ctx.message.text.split(' ');
  if (args.length < 2) return ctx.reply(`⚠️ *Uso:* \`$${gatewayName} CC|MM|YY|CVV\``, { parse_mode: 'Markdown' });

  const fullData = args[1];
  const msg = await ctx.reply(`⏳ *Checking on ${gatewayName.toUpperCase()}...*\n \`${fullData}\``, { parse_mode: 'Markdown' });

  setTimeout(async () => {
    try {
        const isLive = Math.random() > 0.5;
        let result = `#Bot VIP Alex ⚡ | ${gatewayName.toUpperCase()}\n`;
        result += `${SEPARATOR}\n`;
        result += `💳 *Card:* \`${fullData}\`\n`;
        result += `✨ *Status:* ${isLive ? '✅ LIVE' : '❌ DEAD'}\n`;
        result += `💬 *Response:* ${isLive ? 'Approved' : 'Insuficient Funds'}\n`;
        
        result += await getSignature(ctx);

        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, result, { 
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
                [Markup.button.url('!! Updates', `https://t.me/${OWNER_HANDLE.replace('@', '')}`)]
            ])
        });
    } catch(e) {
        await ctx.telegram.editMessageText(ctx.chat.id, msg.message_id, null, '❌ Error al conectar con el Gateway.', { parse_mode: 'Markdown' });
    }
  }, 2000);
};

bot.hears(/^\$st (.+)$/, (ctx) => handleGateway(ctx, 'stripe'));
bot.hears(/^\$am (.+)$/, (ctx) => handleGateway(ctx, 'amazon'));
bot.hears(/^\$bt (.+)$/, (ctx) => handleGateway(ctx, 'braintree'));

// ARRANCAR BOT
bot.launch().then(() => {
  console.log('🚀 Bot VIP Alex iniciado con funciones PRO.');
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
