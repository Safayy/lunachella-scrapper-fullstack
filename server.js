const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();
app.use(cors());

const PORT = process.env.PORT || 3005;

// Detect environment
const isRender = process.env.USE_CHROMIUM === "true";
const puppeteer = isRender ? require("puppeteer-core") : require("puppeteer");
const chromium = isRender ? require("@sparticuz/chromium") : null;

app.get("/kuala-lumpur", async (req, res) => {
    if (!process.env.TARGET_URL) {
        return res.status(500).json({ error: "TARGET_URL env variable not set" });
    }

    let browser = null;
    try {
        let launchOptions = { headless: true };

        if (isRender) {
            const executablePath = typeof chromium.executablePath === "function"
                ? await chromium.executablePath()
                : chromium.executablePath;

            console.log("✅ Render detected, using chromium:");
            console.log("  executablePath:", executablePath);

            launchOptions = {
                args: chromium.args,
                defaultViewport: chromium.defaultViewport,
                executablePath,
                headless: chromium.headless,
            };
        } else {
            console.log("✅ Local detected, using full puppeteer");
        }

        browser = await puppeteer.launch(launchOptions);

        const page = await browser.newPage();
        await page.goto(process.env.TARGET_URL, {
            waitUntil: "networkidle2",
            timeout: 120000,
        });

        await autoScroll(page);
        await page.waitForSelector(".AtIvjk2YjzXSULT1cmVx");

        const events = await page.$$eval(".AtIvjk2YjzXSULT1cmVx", (nodes) =>
            nodes.map((el) => ({
                name: el.querySelector("._5CQoAbgUFZI3p33kRVk")?.innerText.trim() || "",
                location: el.querySelector(".bqB5zhZmpkzqQcKohzfB")?.innerText.trim() || "",
                date: el.querySelector(".r593Wuo4miYix9siDdTP > div")?.innerText.trim() || "",
                image: el.querySelector("img")?.src || "",
            }))
        );

        await browser.close();
        res.status(200).json(events.filter((e) => e.name));
    } catch (error) {
        if (browser) await browser.close();
        console.error("❌ Scraping failed:", error.message);
        res.status(500).json({ error: "Scraping failed", details: error.message });
    }
});

async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 300;
            const timer = setInterval(() => {
                window.scrollBy(0, distance);
                totalHeight += distance;

                if (totalHeight >= document.body.scrollHeight - window.innerHeight) {
                    clearInterval(timer);
                    resolve();
                }
            }, 300);
        });
    });
}

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});
