const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

// Apply the stealth plugin to evade headless browser detection
puppeteer.use(StealthPlugin());

// Pull the token from Railway Environment Variables
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("ERROR: BOT_TOKEN environment variable is missing.");
    process.exit(1);
}

// Initialize the bot
const bot = new TelegramBot(token, { polling: true });

// Attempt to load cookies.json securely
let cookies;
try {
    cookies = require('./cookies.json');
} catch (error) {
    console.error("ERROR: cookies.json file not found or invalid format.");
}

// Listen for /start command
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    if (!cookies) {
        return bot.sendMessage(chatId, "❌ Cannot proceed: `cookies.json` is missing or invalid.", { parse_mode: "Markdown" });
    }

    const processingMsg = await bot.sendMessage(chatId, "🔄 Launching stealth browser and checking session...");

    let browser;
    const screenshotPath = path.join(__dirname, 'test.png');

    try {
        // Launch Puppeteer with Railway container optimizations
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        const page = await browser.newPage();

        // 1. Set a standard Human User-Agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // 2. Set a standard desktop screen resolution
        await page.setViewport({ width: 1920, height: 1080 });

        // 3. Establish origin
        await page.goto("https://accounts.atxp.ai");

        // 4. Inject Cookies
        await page.setCookie(...cookies);

        // Optional Local Storage Injection: 
        // If the site still fails, uncomment the block below and add your Privy token data
        /*
        await page.evaluate(() => {
            localStorage.setItem('privy:token', 'YOUR_TOKEN_VALUE_HERE');
        });
        */

        // 5. Reload the page with session applied
        await page.goto("https://accounts.atxp.ai", {
            waitUntil: "networkidle2"
        });

        // 6. Give the frontend UI 3 seconds to fully process the login state
        await new Promise(resolve => setTimeout(resolve, 3000));

        const pageTitle = await page.title();
        console.log(`Successfully loaded: ${pageTitle}`);

        // Take the screenshot
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });

        // Send the screenshot to the Telegram user
        await bot.sendPhoto(chatId, screenshotPath, {
            caption: `✅ **Screenshot Captured!**\n**Page Title:** ${pageTitle}`,
            parse_mode: "Markdown"
        });

    } catch (error) {
        console.error("Puppeteer Error:", error);
        bot.sendMessage(chatId, `❌ **An error occurred:**\n\`${error.message}\``, { parse_mode: "Markdown" });
    } finally {
        // Cleanup resources
        if (browser) await browser.close();
        if (fs.existsSync(screenshotPath)) {
            fs.unlinkSync(screenshotPath);
        }
        
        bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    }
});

console.log("Bot is online and polling...");
    const screenshotPath = path.join(__dirname, 'test.png');

    try {
        // Launch Puppeteer with args required for Railway containers
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ]
        });

        const page = await browser.newPage();

        // Navigate to the domain first to establish the origin
        await page.goto("https://accounts.atxp.ai");

        // Inject the cookies
        await page.setCookie(...cookies);

        // Reload with cookies applied
        await page.goto("https://accounts.atxp.ai", {
            waitUntil: "networkidle2"
        });

        const pageTitle = await page.title();
        console.log(`Successfully loaded: ${pageTitle}`);

        // Take the screenshot
        await page.screenshot({
            path: screenshotPath,
            fullPage: true
        });

        // Send the screenshot to the user
        await bot.sendPhoto(chatId, screenshotPath, {
            caption: `✅ **Screenshot Captured!**\n**Page Title:** ${pageTitle}`,
            parse_mode: "Markdown"
        });

    } catch (error) {
        console.error("Puppeteer Error:", error);
        bot.sendMessage(chatId, `❌ **An error occurred:**\n\`${error.message}\``, { parse_mode: "Markdown" });
    } finally {
        // Cleanup: Close browser and delete the image to free up Railway container space
        if (browser) await browser.close();
        if (fs.existsSync(screenshotPath)) {
            fs.unlinkSync(screenshotPath);
        }
        
        // Delete the "processing" message
        bot.deleteMessage(chatId, processingMsg.message_id).catch(() => {});
    }
});

console.log("Bot is online and polling...");
