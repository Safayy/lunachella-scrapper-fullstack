const express = require("express");
const puppeteer = require("puppeteer-core"); // use puppeteer-core
const chromium = require("@sparticuz/chromium"); // import chromium
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3005;  // <-- Use Render's PORT env or fallback

app.get("/kuala-lumpur", async (req, res) => {
    if (!process.env.TARGET_URL) {
        return res.status(500).json({ error: "TARGET_URL env variable not set" });
    }

    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });

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
        console.error("Scraping failed:", error.message);
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
    console.log(`Server running at http://localhost:${PORT}`);
});
