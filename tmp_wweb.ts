import { Client, LocalAuth } from 'whatsapp-web.js';

const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'امجد',
      dataPath: '/home/amged/wa sender/.wwebjs_auth',
    }),
    puppeteer: {
      executablePath: '/usr/bin/google-chrome',
      args: ['--no-sandbox'],
      headless: true,
    }
});
console.log('Initializing client...');
client.initialize().then(() => {
    console.log('client initialized!');
    client.destroy();
    process.exit(0);
}).catch(err => {
    console.error('Error!', err);
    process.exit(1);
});
client.on('qr', (qr) => { console.log('got QR'); process.exit(0); });
client.on('loading_screen', () => console.log('loading screen'));
