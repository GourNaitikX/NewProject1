const TelegramBot = require("node-telegram-bot-api");
const puppeteer = require("puppeteer");

const TOKEN = process.env.BOT_TOKEN || "8889195963:AAGKHXrCa1DrYMpyKA-XKWSFyobwlNTOgM4";

const bot = new TelegramBot(TOKEN, {
  polling: true
});

const waitingUsers = new Set();

bot.onText(/\/start/, async (msg) => {
  waitingUsers.add(msg.chat.id);

  await bot.sendMessage(
    msg.chat.id,
    "Type which number you want to send.\n\nExample:\n1234"
  );
});

bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "/start") return;
  if (!waitingUsers.has(chatId)) return;

  const number = msg.text.trim();

  waitingUsers.delete(chatId);

  await bot.sendMessage(chatId, `Sending: ${number}`);

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

    const page = await browser.newPage();

    await page.goto(
      "https://vipcentre.site/checkdemo.php",
      {
        waitUntil: "networkidle2",
        timeout: 60000
      }
    );

    await page.evaluate((num) => {
      const input = document.querySelector("#phone_number");

      if (input) {
        input.value = num;
        input.dispatchEvent(
          new Event("input", { bubbles: true })
        );
        input.dispatchEvent(
          new Event("change", { bubbles: true })
        );
      }

      const btn = document.querySelector(
        'button[type="submit"], input[type="submit"], button'
      );

      if (btn) {
        btn.click();
      }
    }, number);

    await new Promise(resolve => setTimeout(resolve, 3000));

    const screenshot = await page.screenshot({
      fullPage: true
    });

    await bot.sendPhoto(chatId, screenshot, {
      caption: `Done.\nNumber: ${number}`
    });

    await browser.close();
  } catch (err) {
    if (browser) {
      await browser.close();
    }

    await bot.sendMessage(
      chatId,
      `Error:\n${err.message}`
    );
  }
});

console.log("Bot running...");
