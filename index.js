// Importation des modules nécessaires
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { CohereClient } = require('cohere-ai');

// Clé API Cohere
const API_KEY = 'oS7MBerWYQYUP22aOLES6nh4pg2aCrcU3Sh0pNqH';

// Initialisation du client Cohere
const cohere = new CohereClient({
    token: API_KEY, 
});

// Créez une Map pour stocker les sessions de chat pour chaque contact
const chatSessions = new Map();

// Initialisation du client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

// Événement : affichage du QR code pour la connexion
client.on('qr', qr => {
    qrcode.generate(qr, { small: true });
    console.log('Veuillez scanner ce QR code avec votre téléphone.');
});

// Événement : confirmation que le bot est prêt
client.on('ready', () => {
    console.log('✅ Le bot est prêt et connecté !');
});

// Événement : réception d'un message
client.on('message', async message => {
    const from = message.from;
    const body = message.body.toLowerCase();

    if (from.endsWith('@g.us') || from === 'status@broadcast' || !body) {
        return;
    }

    console.log(`Message reçu de ${from}: "${message.body}"`);

    // Logique de réponse rapide pour les questions fréquentes
    if (body.includes('prix') || body.includes('coût') || body.includes('tarifs')) {
        await client.sendMessage(from, "Les tarifs dépendent du projet. Pour un devis précis, veuillez contacter Silvano directement.");
        return;
    }
    if (body.includes('services') || body.includes('offrez-vous')) {
        await client.sendMessage(from, "Silvano offre des services de développement de sites web, d'applications mobiles, de solutions e-commerce, et d'optimisation SEO.");
        return;
    }
    if (body.includes('contact') || body.includes('joindre')) {
        await client.sendMessage(from, "Pour contacter Silvano, vous pouvez lui envoyer un message ici ou le joindre par e-mail à silvano.dev@email.com.");
        return;
    }

    // Réponse par l'IA si aucun mot-clé n'a été détecté
    try {
        const result = await cohere.chat({
            model: 'command-r-plus',
            message: message.body,
            preamble: "Ton rôle est d'être l'assistant de Silvano, développeur web. Tu réponds uniquement aux questions sur ses services (sites web, applications, SEO) avec un ton professionnel et direct. Si la question est hors sujet, tu renvoies à Silvano. Tu réponds de manière courte.",
            // L'historique des messages est géré ici
            chatHistory: chatSessions.get(from) || [],
        });
        
        const responseText = result.text;
        await client.sendMessage(from, responseText);
        console.log(`Réponse envoyée à ${from}: "${responseText}"`);

        // Mettre à jour l'historique de la session pour la prochaine conversation
        const newChatHistory = chatSessions.get(from) || [];
        newChatHistory.push({ role: 'USER', message: message.body });
        newChatHistory.push({ role: 'CHATBOT', message: responseText });
        chatSessions.set(from, newChatHistory);

    } catch (error) {
        console.error('Erreur lors de la génération de contenu par Cohere:', error);
        await client.sendMessage(from, "Désolé, je ne peux pas vous répondre pour le moment. Une erreur est survenue.");
    }
});

// Démarrage du client
client.initialize();
