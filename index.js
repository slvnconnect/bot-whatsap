// Importation des modules
const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const { CohereClient } = require('cohere-ai');
const qrcode = require('qrcode-terminal');

// TA CLÉ API COHERE (colle-la ici)
// Garde-la en sécurité et ne la partage pas.
const COHERE_API_KEY = 'oS7MBerWYQYUP22aOLES6nh4pg2aCrcU3Sh0pNqH';
const cohere = new CohereClient({ token: COHERE_API_KEY });

// Un tableau pour maintenir l'historique de la conversation
let chatHistory = [];

async function connectToWhatsApp() {
    // Utilise useMultiFileAuthState pour sauvegarder l'authentification
    const { state, saveCreds } = await useMultiFileAuthState('baileys_auth');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false 
    });

    // Événement pour le QR code
    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            qrcode.generate(qr, { small: true });
            console.log('📱 Scanne ce QR code avec WhatsApp pour te connecter.');
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

    // Événement pour les messages
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

    // Événement pour sauvegarder les identifiants
    sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();
