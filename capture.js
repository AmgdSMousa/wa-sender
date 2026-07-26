const puppeteer = require('puppeteer');

(async () => {
    console.log('Starting headless capture of web.whatsapp.com...');
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/google-chrome',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        headless: true
    });
    const page = await browser.newPage();
    console.log('Navigating...');
    try {
        await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('Saving screenshot...');
        await page.screenshot({ path: '/home/amged/wa sender/whatsapp_capture.png' });
        console.log('Success!');
    } catch (e) {
        console.error('Capture failed:', e.message);
    } finally {
        await browser.close();
    }
})();
