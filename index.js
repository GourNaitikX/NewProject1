const TelegramBot = require("node-telegram-bot-api");
const puppeteer = require("puppeteer");

const TOKEN = process.env.BOT_TOKEN;

if (!TOKEN) {
  console.error("BOT_TOKEN variable not found");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
  polling: true
});

const waitingUsers = new Set();

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  waitingUsers.add(chatId);

  await bot.sendMessage(
    chatId,
    "Type which number you want to send.\n\nExample:\n1234"
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (!msg.text) return;
  if (msg.text === "/start") return;
  if (!waitingUsers.has(chatId)) return;

  waitingUsers.delete(chatId);

  const number = msg.text.trim();

  let browser;

  try {
    await bot.sendMessage(
      chatId,
      `Processing number: ${number}`
    );

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    });

    const page = await browser.newPage();

    await page.setViewport({
      width: 1280,
      height: 720
    });

    await page.goto(
      "https://vipcentre.site/checkdemo.php",
      {
        waitUntil: "networkidle2",
        timeout: 60000
      }
    );

    await page.waitForSelector("#phone_number");

    await page.type("#phone_number", number, {
      delay: 100
    });

    // Screenshot before submit
    const beforeSubmit = await page.screenshot({
      fullPage: true
    });

    await bot.sendPhoto(chatId, beforeSubmit, {
      caption: `Number entered: ${number}`
    });

    await page.click(
      'button[type="submit"], input[type="submit"], button'
    );

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Screenshot after submit
    const afterSubmit = await page.screenshot({
      fullPage: true
    });

    await bot.sendPhoto(chatId, afterSubmit, {
      caption: `After submit: ${number}`
    });

    await bot.sendMessage(
      chatId,
      "Task completed successfully."
    );

    await browser.close();
  } catch (err) {
    console.error(err);

    if (browser) {
      await browser.close();
    }

    await bot.sendMessage(
      chatId,
      `Error:\n${err.message}`
    );
  }
});

console.log("Bot is running...");
