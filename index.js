const TelegramBot = require("node-telegram-bot-api");
const puppeteer = require("puppeteer");
const { PuppeteerScreenRecorder } = require("puppeteer-screen-recorder");

const TOKEN = process.env.BOT_TOKEN;

const bot = new TelegramBot(TOKEN, {
  polling: true
});

bot.onText(/\/start/, async (msg) => {
  await bot.sendMessage(
    msg.chat.id,
    "Type which number you want to send.\n\nExample:\n1234"
  );
});

bot.on("message", async (msg) => {
  if (!msg.text || msg.text === "/start") return;

  const chatId = msg.chat.id;
  const number = msg.text.trim();

  let browser;

  try {
    await bot.sendMessage(chatId, `Processing ${number}...`);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox"
      ]
    });

    const page = await browser.newPage();

    const recorder = new PuppeteerScreenRecorder(page, {
      followNewTab: true,
      fps: 25,
      videoFrame: {
        width: 1280,
        height: 720
      }
    });

    const videoFile = `recording-${Date.now()}.mp4`;

    await recorder.start(videoFile);

    await page.goto(
      "https://vipcentre.site/checkdemo.php",
      {
        waitUntil: "networkidle2"
      }
    );

    await page.type("#phone_number", number, {
      delay: 150
    });

    await page.click(
      'button[type="submit"], input[type="submit"], button'
    );

    await page.waitForTimeout(5000);

    await recorder.stop();

    await bot.sendVideo(chatId, videoFile, {
      caption: `Completed: ${number}`
    });

    await browser.close();
  } catch (e) {
    if (browser) {
      await browser.close();
    }

    await bot.sendMessage(chatId, `Error: ${e.message}`);
  }
});

console.log("Bot running...");
