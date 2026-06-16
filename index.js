const TelegramBot = require('node-telegram-bot-api');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

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
        return bot.sendMessage(chatId, "❌ Cannot proceed: `cookies.json` is missing or invalid on the server.", { parse_mode: "Markdown" });
    }

    // Send an initial processing message
    const processingMsg = await bot.sendMessage(chatId, "🔄 Checking cookies and generating screenshot. Please wait...");

    let browser;
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
