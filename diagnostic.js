const { Client, LocalAuth } = require('whatsapp-web.js');

console.log('Starting standalone WA client diagnostic (no-terminal-qr)...');

const client = new Client({
    authStrategy: new LocalAuth({
        clientId: 'diagnostic',
        dataPath: './.wwebjs_auth_diag'
    }),
    puppeteer: {
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true,
    }
});

client.on('qr', (qr) => {
    console.log('QR RECEIVED:', qr);
});

client.on('ready', () => {
    console.log('Client is ready!');
});

client.on('loading_screen', (percent, message) => {
    console.log('LOADING SCREEN', percent, message);
});

client.on('authenticated', () => {
    console.log('AUTHENTICATED');
});

client.on('auth_failure', (msg) => {
    console.error('AUTHENTICATION FAILURE', msg);
});

console.log('Initializing...');
client.initialize()
    .then(() => console.log('Init promise resolved'))
    .catch(err => console.error('Init error:', err));

setTimeout(() => {
    console.log('Final timeout reached after 60s. Closing.');
    process.exit(0);
}, 60000);
