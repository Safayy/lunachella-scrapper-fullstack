const chromiumImport = require('@sparticuz/chromium');
const chromium = chromiumImport.default; // ✅ Access the real object

(async () => {
    const executablePath = typeof chromium.executablePath === "function"
        ? await chromium.executablePath()
        : chromium.executablePath;

    console.log("✅ Executable path:", executablePath);
})();
