// Importation des modules
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { CohereClient } = require('cohere-ai');
const qrcode = require('qrcode-terminal');

const COHERE_API_KEY = 'oS7MBerWYQYUP22aOLES6nh4pg2aCrcU3Sh0pNqH';
const cohere = new CohereClient({ token: COHERE_API_KEY });

let chatHistory = [];

async function connectToWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qr)}&size=300x300&ecc=L`;
            console.log('🔗 Copie ce lien et ouvre-le dans ton navigateur pour scanner le QR code :');
            console.log(qrUrl);
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== 401;
            console.log('❌ Connexion fermée. Reconnexion ?', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ Bot connecté et prêt !');
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.key.fromMe && m.type === 'notify') {
            const sender = msg.key.remoteJid;
            const text = msg.message?.extendedTextMessage?.text || msg.message?.conversation;

            try {
                const response = await cohere.chat({
                    model: 'command',
                    message: text,
                    chatHistory: chatHistory,
                });

                const replyText = response.text;
                
                await sock.sendMessage(sender, { text: replyText });
                
                chatHistory.push({ role: "USER", message: text });
                chatHistory.push({ role: "CHATBOT", message: replyText });
                
            } catch (e) {
                console.error('Erreur Cohere :', e);
                await sock.sendMessage(sender, { text: 'Désolé, une erreur est survenue.' });
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
