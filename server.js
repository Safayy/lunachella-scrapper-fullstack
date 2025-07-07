// bandsintown_scraper.js
const express = require("express");
const puppeteer = require("puppeteer");
const cors = require("cors");
const dotenv = require("dotenv");

const app = express();
app.use(cors());
const PORT = 3000;
dotenv.config();

app.get("/kuala-lumpur", async (req, res) => {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
        });

        const page = await browser.newPage();

        const url = process.env.DATABASE_URL;
        await page.goto(url, {
            waitUntil: "networkidle2",
            timeout: 120000,
        });

        // Scroll to load all events
        await autoScroll(page);

        // Wait for at least one event block
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
        console.error("Scraping failed:", error.message);
        res.status(500).json({ error: "Scraping failed", details: error.message });
    }
});

// Scroll function to load all concerts
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
    console.log(` Server running at http://localhost:${PORT}`);
});
